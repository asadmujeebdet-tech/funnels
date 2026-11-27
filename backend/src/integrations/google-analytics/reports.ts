import type { BetaAnalyticsDataClient, v1alpha } from "@google-analytics/data";
import { config } from "../../config/env";
import { memoryCache } from "../../cache/memory-cache";
import type { EventPopulation } from "../../analytics/journey";

function versionFilter(appVersion?: string) {
  return appVersion ? {
    filter: {
      fieldName: "appVersion",
      stringFilter: { matchType: "EXACT" as const, value: appVersion },
    },
  } : undefined;
}

function reportFilters(appVersion?: string, country?: string) {
  const expressions = [
    appVersion ? versionFilter(appVersion)?.filter : undefined,
    country ? {
      fieldName: "country",
      stringFilter: { matchType: "EXACT" as const, value: country },
    } : undefined,
  ].filter((filter): filter is NonNullable<typeof filter> => Boolean(filter));
  if (expressions.length === 0) {
    return undefined;
  }
  if (expressions.length === 1) {
    return { filter: expressions[0] };
  }
  return { andGroup: { expressions: expressions.map((filter) => ({ filter })) } };
}

function metricNumber(value: string | null | undefined): number | null {
  if (value === undefined || value === "") {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function discoverEvents(
  client: BetaAnalyticsDataClient,
  propertyId: string,
  startDate: string,
  endDate: string,
  appVersion?: string,
): Promise<string[]> {
  const cacheKey = `events:${propertyId}:${startDate}:${endDate}:${appVersion ?? ""}`;
  const cached = memoryCache.get<string[]>(cacheKey);
  if (cached) {
    return cached;
  }

  const [report] = await client.runReport({
    property: `properties/${propertyId}`,
    dateRanges: [{ startDate, endDate }],
    dimensions: [{ name: "eventName" }],
    metrics: [{ name: "eventCount" }],
    dimensionFilter: versionFilter(appVersion),
    limit: 10000,
    orderBys: [{ dimension: { dimensionName: "eventName" } }],
  });
  const events = (report.rows ?? [])
    .map((row) => row.dimensionValues?.[0]?.value)
    .filter((name): name is string => Boolean(name));
  memoryCache.set(cacheKey, events, config.GA4_CACHE_TTL);
  return events;
}

export async function getEventPopulations(
  client: BetaAnalyticsDataClient,
  propertyId: string,
  eventNames: string[],
  startDate: string,
  endDate: string,
  appVersion?: string,
  country?: string,
): Promise<Map<string, EventPopulation>> {
  const cacheKey = `populations-v2:${propertyId}:${eventNames.join(",")}:${startDate}:${endDate}:${appVersion ?? ""}:${country ?? ""}`;
  const cached = memoryCache.get<Array<[string, EventPopulation]>>(cacheKey);
  if (cached) {
    return new Map(cached);
  }

  const [report] = await client.runReport({
    property: `properties/${propertyId}`,
    dateRanges: [{ startDate, endDate }],
    dimensions: [{ name: "eventName" }],
    metrics: [{ name: "totalUsers" }, { name: "eventCount" }],
    dimensionFilter: reportFilters(appVersion, country),
    limit: 10000,
  });
  const populations = new Map<string, EventPopulation>();
  const requestedEvents = new Set(eventNames);
  for (const row of report.rows ?? []) {
    const eventName = row.dimensionValues?.[0]?.value;
    if (!eventName || !requestedEvents.has(eventName)) {
      continue;
    }
    populations.set(eventName, {
      eventName,
      activeUsers: Number(row.metricValues?.[0]?.value ?? 0),
      eventCount: Number(row.metricValues?.[1]?.value ?? 0),
    });
  }
  memoryCache.set(cacheKey, [...populations], config.GA4_CACHE_TTL);
  return populations;
}

const MAX_FUNNEL_STEPS = 10;

/**
 * Sequential (closed) funnel, matching GA4 Explore > Funnel exploration: a user counts at a step
 * only after completing the previous steps in order. Returns active users per step in step order,
 * or null when the funnel can't be run (too many steps, API unavailable) so callers can fall back.
 */
export async function getFunnelUsers(
  client: v1alpha.AlphaAnalyticsDataClient,
  propertyId: string,
  eventNames: string[],
  startDate: string,
  endDate: string,
  appVersion?: string,
): Promise<number[] | null> {
  if (eventNames.length === 0 || eventNames.length > MAX_FUNNEL_STEPS) {
    return null;
  }
  const cacheKey = `funnel:${propertyId}:${eventNames.join(",")}:${startDate}:${endDate}:${appVersion ?? ""}`;
  const cached = memoryCache.get<number[]>(cacheKey);
  if (cached) {
    return cached;
  }
  try {
    const [report] = await client.runFunnelReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate, endDate }],
      funnel: {
        isOpenFunnel: false,
        steps: eventNames.map((eventName, index) => ({
          name: `${index + 1}. ${eventName}`,
          filterExpression: { funnelEventFilter: { eventName } },
        })),
      },
      dimensionFilter: versionFilter(appVersion),
    });
    const table = report.funnelTable;
    const usersIndex = Math.max(0, (table?.metricHeaders ?? []).findIndex((header) => header.name === "activeUsers"));
    const users = (table?.rows ?? []).map((row) => Number(row.metricValues?.[usersIndex]?.value ?? 0));
    if (users.length !== eventNames.length) {
      return null;
    }
    memoryCache.set(cacheKey, users, config.GA4_CACHE_TTL);
    return users;
  } catch (error) {
    console.error("GA4 funnel report failed; falling back to independent event populations", error);
    return null;
  }
}

export async function validateProperty(client: BetaAnalyticsDataClient, propertyId: string): Promise<void> {
  await client.getMetadata({ name: `properties/${propertyId}/metadata` });
}

export type CampaignCost = { campaign: string; cost: number };

export type CampaignTrend = {
  date: string;
  cost: number | null;
  clicks: number | null;
  impressions: number | null;
};

export type CampaignReportRow = {
  campaign: string;
  cost: number | null;
  impressions: number | null;
  clicks: number | null;
  ctr: number | null;
  cpc: number | null;
  trend: CampaignTrend[];
};

function ratio(numerator: number | null, denominator: number | null): number | null {
  return numerator === null || denominator === null || denominator === 0 ? null : numerator / denominator;
}

/** Google Ads metrics require the GA4 property to be linked to Google Ads. */
export async function getCampaignCosts(
  client: BetaAnalyticsDataClient,
  propertyId: string,
  startDate: string,
  endDate: string,
): Promise<{ campaigns: CampaignReportRow[]; currency: string | null; trend: CampaignTrend[] }> {
  const cacheKey = `campaigns:${propertyId}:${startDate}:${endDate}`;
  const cached = memoryCache.get<{ campaigns: CampaignReportRow[]; currency: string | null; trend: CampaignTrend[] }>(cacheKey);
  if (cached) {
    return cached;
  }

  const metrics = [
    { name: "advertiserAdCost" },
    { name: "advertiserAdClicks" },
    { name: "advertiserAdImpressions" },
  ];
  const [report] = await client.runReport({
    property: `properties/${propertyId}`,
    dateRanges: [{ startDate, endDate }],
    dimensions: [{ name: "sessionGoogleAdsCampaignName" }],
    metrics,
    orderBys: [{ metric: { metricName: "advertiserAdCost" }, desc: true }],
    limit: 10000,
  });

  const campaignRows = (report.rows ?? []).filter((row) => {
    const name = row.dimensionValues?.[0]?.value;
    return Boolean(name && name !== "(not set)" && name !== "(organic)");
  });
  const campaignMap = new Map<string, CampaignReportRow>();
  for (const row of campaignRows) {
    const campaign = row.dimensionValues?.[0]?.value;
    if (!campaign) {
      continue;
    }
    const cost = metricNumber(row.metricValues?.[0]?.value);
    const clicks = metricNumber(row.metricValues?.[1]?.value);
    const impressions = metricNumber(row.metricValues?.[2]?.value);
    campaignMap.set(campaign, {
      campaign,
      cost,
      impressions,
      clicks,
      ctr: ratio(clicks, impressions),
      cpc: ratio(cost, clicks),
      trend: [],
    });
  }

  const [trendReport] = await client.runReport({
    property: `properties/${propertyId}`,
    dateRanges: [{ startDate, endDate }],
    dimensions: [{ name: "sessionGoogleAdsCampaignName" }, { name: "date" }],
    metrics,
    orderBys: [{ dimension: { dimensionName: "date" } }],
    limit: 100000,
  });
  for (const row of trendReport.rows ?? []) {
    const campaign = row.dimensionValues?.[0]?.value;
    const rawDate = row.dimensionValues?.[1]?.value;
    const target = campaign ? campaignMap.get(campaign) : undefined;
    if (!target || !rawDate || !/^\d{8}$/.test(rawDate)) {
      continue;
    }
    target.trend.push({
      date: `${rawDate.slice(0, 4)}-${rawDate.slice(4, 6)}-${rawDate.slice(6, 8)}`,
      cost: metricNumber(row.metricValues?.[0]?.value),
      clicks: metricNumber(row.metricValues?.[1]?.value),
      impressions: metricNumber(row.metricValues?.[2]?.value),
    });
  }

  const campaigns = [...campaignMap.values()];
  const trendByDate = new Map<string, CampaignTrend>();
  for (const campaign of campaigns) {
    for (const point of campaign.trend) {
      const aggregate = trendByDate.get(point.date) ?? { date: point.date, cost: null, clicks: null, impressions: null };
      for (const metric of ["cost", "clicks", "impressions"] as const) {
        const value = point[metric];
        if (value !== null) {
          aggregate[metric] = (aggregate[metric] ?? 0) + value;
        }
      }
      trendByDate.set(point.date, aggregate);
    }
  }
  const result = {
    campaigns,
    currency: report.metadata?.currencyCode ?? null,
    trend: [...trendByDate.values()].sort((left, right) => left.date.localeCompare(right.date)),
  };
  memoryCache.set(cacheKey, result, config.GA4_CACHE_TTL);
  return result;
}

export type OverviewMetrics = {
  activeUsers: number | null;
  newUsers: number | null;
  crashAffectedUsers: number | null;
  engagementRate: number | null;
  userEngagementDuration: number | null;
  sessionsPerActiveUser: number | null;
};

export async function getOverviewMetrics(
  client: BetaAnalyticsDataClient,
  propertyId: string,
  startDate: string,
  endDate: string,
  appVersion?: string,
  country?: string,
): Promise<OverviewMetrics> {
  const metricNames = [
    "activeUsers",
    "newUsers",
    "crashAffectedUsers",
    "engagementRate",
    "userEngagementDuration",
    "sessionsPerActiveUser",
  ];
  const metrics: OverviewMetrics = {
    activeUsers: null,
    newUsers: null,
    crashAffectedUsers: null,
    engagementRate: null,
    userEngagementDuration: null,
    sessionsPerActiveUser: null,
  };
  const cacheKey = `overview-metrics:${propertyId}:${startDate}:${endDate}:${appVersion ?? ""}:${country ?? ""}`;
  const cached = memoryCache.get<OverviewMetrics>(cacheKey);
  if (cached) {
    return cached;
  }
  try {
    const [report] = await client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate, endDate }],
      metrics: metricNames.map((name) => ({ name })),
      dimensionFilter: reportFilters(appVersion, country),
    });
    metricNames.forEach((name, index) => {
      metrics[name as keyof OverviewMetrics] = metricNumber(report.rows?.[0]?.metricValues?.[index]?.value);
    });
  } catch {
    // Some properties do not expose mobile-app-only metrics. Query each metric separately
    // so an unsupported metric does not hide the rest of the available overview.
    const results = await Promise.all(metricNames.map(async (name) => {
      try {
        const [report] = await client.runReport({
          property: `properties/${propertyId}`,
          dateRanges: [{ startDate, endDate }],
          metrics: [{ name }],
          dimensionFilter: reportFilters(appVersion, country),
        });
        return metricNumber(report.rows?.[0]?.metricValues?.[0]?.value);
      } catch {
        return null;
      }
    }));
    metricNames.forEach((name, index) => {
      metrics[name as keyof OverviewMetrics] = results[index];
    });
  }
  memoryCache.set(cacheKey, metrics, config.GA4_CACHE_TTL);
  return metrics;
}

export async function getOverviewChoices(
  client: BetaAnalyticsDataClient,
  propertyId: string,
  startDate: string,
  endDate: string,
): Promise<{ appVersions: string[]; countries: string[]; timeZone: string | null }> {
  const [versions, countries] = await Promise.all([
    client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: "appVersion" }],
      metrics: [{ name: "activeUsers" }],
      limit: 10000,
    }).then(([report]) => report).catch(() => undefined),
    client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: "country" }],
      metrics: [{ name: "activeUsers" }],
      limit: 10000,
    }).then(([report]) => report).catch(() => undefined),
  ]);
  const values = (report: {
    rows?: Array<{ dimensionValues?: Array<{ value?: string | null }> | null }> | null;
  } | undefined) => (report?.rows ?? [])
    .map((row) => row.dimensionValues?.[0]?.value)
    .filter((value): value is string => Boolean(value));
  return {
    appVersions: values(versions),
    countries: values(countries),
    timeZone: versions?.metadata?.timeZone ?? countries?.metadata?.timeZone ?? null,
  };
}
