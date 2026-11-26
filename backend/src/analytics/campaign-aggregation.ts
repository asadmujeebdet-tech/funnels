export type CampaignTrendPoint = {
  date: string;
  cost: number | null;
  clicks: number | null;
  impressions: number | null;
};

export type CampaignSourceRow = {
  campaign: string;
  cost: number | null;
  clicks: number | null;
  impressions: number | null;
  trend: CampaignTrendPoint[];
};

export type CampaignSourceReport = {
  currency: string | null;
  campaigns: CampaignSourceRow[];
};

export type AggregatedCampaignRow = CampaignSourceRow & {
  ctr: number | null;
  cpc: number | null;
};

export type AggregatedCampaignReport = {
  currency: string | null;
  totalCost: number | null;
  campaigns: AggregatedCampaignRow[];
  trend: CampaignTrendPoint[];
};

type CampaignAccumulator = {
  campaign: string;
  cost: number | null | undefined;
  clicks: number | null | undefined;
  impressions: number | null | undefined;
  trend: Map<string, TrendAccumulator>;
};

type TrendAccumulator = Omit<CampaignTrendPoint, "cost" | "clicks" | "impressions"> & {
  cost: number | null | undefined;
  clicks: number | null | undefined;
  impressions: number | null | undefined;
};

function sumNullable(current: number | null | undefined, next: number | null): number | null {
  if (current === undefined) {
    return next;
  }
  if (current === null || next === null) {
    return null;
  }
  return current + next;
}

function ratio(numerator: number | null, denominator: number | null): number | null {
  return numerator === null || denominator === null || denominator === 0 ? null : numerator / denominator;
}

export function aggregateCampaignReports(reports: CampaignSourceReport[]): AggregatedCampaignReport {
  const currencies = new Set(reports.map((report) => report.currency));
  if (currencies.size > 1) {
    const error = new Error("Campaign reports use different currencies across your apps and cannot be combined.");
    Object.assign(error, { status: 422 });
    throw error;
  }

  const campaignMap = new Map<string, CampaignAccumulator>();
  for (const report of reports) {
    for (const campaign of report.campaigns) {
      const current = campaignMap.get(campaign.campaign) ?? {
        campaign: campaign.campaign,
        cost: undefined,
        clicks: undefined,
        impressions: undefined,
        trend: new Map(),
      };
      current.cost = sumNullable(current.cost, campaign.cost);
      current.clicks = sumNullable(current.clicks, campaign.clicks);
      current.impressions = sumNullable(current.impressions, campaign.impressions);
      campaignMap.set(campaign.campaign, current);

      for (const point of campaign.trend) {
        const aggregate = current.trend.get(point.date) ?? {
          date: point.date,
          cost: undefined,
          clicks: undefined,
          impressions: undefined,
        };
        aggregate.cost = sumNullable(aggregate.cost, point.cost);
        aggregate.clicks = sumNullable(aggregate.clicks, point.clicks);
        aggregate.impressions = sumNullable(aggregate.impressions, point.impressions);
        current.trend.set(point.date, aggregate);
      }
    }
  }

  const campaigns = [...campaignMap.values()].map(({ campaign, cost, clicks, impressions, trend }) => ({
    campaign,
    cost: cost ?? null,
    clicks: clicks ?? null,
    impressions: impressions ?? null,
    ctr: ratio(clicks ?? null, impressions ?? null),
    cpc: ratio(cost ?? null, clicks ?? null),
    trend: [...trend.values()]
      .map((point) => ({ ...point, cost: point.cost ?? null, clicks: point.clicks ?? null, impressions: point.impressions ?? null }))
      .sort((left, right) => left.date.localeCompare(right.date)),
  })).sort((left, right) => (right.cost ?? -Infinity) - (left.cost ?? -Infinity));
  const costs = campaigns.map(({ cost }) => cost);
  const totalCost = costs.length > 0 && costs.every((cost): cost is number => cost !== null)
    ? costs.reduce((total, cost) => total + cost, 0)
    : null;
  const trendMap = new Map<string, TrendAccumulator>();
  for (const campaign of campaigns) {
    for (const point of campaign.trend) {
      const aggregate = trendMap.get(point.date) ?? { date: point.date, cost: undefined, clicks: undefined, impressions: undefined };
      aggregate.cost = sumNullable(aggregate.cost, point.cost);
      aggregate.clicks = sumNullable(aggregate.clicks, point.clicks);
      aggregate.impressions = sumNullable(aggregate.impressions, point.impressions);
      trendMap.set(point.date, aggregate);
    }
  }
  const trend = [...trendMap.values()]
    .map((point) => ({ ...point, cost: point.cost ?? null, clicks: point.clicks ?? null, impressions: point.impressions ?? null }))
    .sort((left, right) => left.date.localeCompare(right.date));

  return { currency: reports[0]?.currency ?? null, totalCost, campaigns, trend };
}
