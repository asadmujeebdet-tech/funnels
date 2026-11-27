export type Profile = { id: string; email: string; name: string | null };
export type Application = {
  id: string;
  name: string;
  packageName: string | null;
  appUrl: string | null;
  appIconData: string | null;
  appIconUrl: string | null;
  ga4PropertyId: string | null;
  updatedAt?: string;
  _count?: { features: number };
};
export type FeatureEvent = { id: string; eventName: string; position: number };
export type Feature = { id: string; name: string; createdAt?: string; updatedAt?: string; events: FeatureEvent[] };
export type JourneyEvent = {
  eventName: string;
  position: number;
  activeUsers: number;
  eventCount: number;
  dropPercentage: number | null;
};
export type Journey = {
  feature: { id: string; name: string };
  startDate: string;
  endDate: string;
  appVersion: string | null;
  comparisonType: string;
  events: JourneyEvent[];
};
export type SavedReport = { id: string; name: string; config: Record<string, unknown>; updatedAt: string };
export type SyncJob = { id: string; status: string; createdAt: string; completedAt: string | null; error: string | null };
export type CampaignCostReport = {
  startDate: string;
  endDate: string;
  currency: string | null;
  totalCost: number | null;
  campaigns: Array<{
    campaign: string;
    cost: number | null;
    impressions: number | null;
    clicks: number | null;
    ctr: number | null;
    cpc: number | null;
    trend?: Array<{ date: string; cost: number | null; clicks: number | null; impressions: number | null }>;
  }>;
  trend: Array<{ date: string; cost: number | null; clicks: number | null; impressions: number | null }>;
};

export type OverviewMetrics = {
  activeUsers: number | null;
  newUsers: number | null;
  crashAffectedUsers: number | null;
  engagementRate: number | null;
  userEngagementDuration: number | null;
  sessionsPerActiveUser: number | null;
  engagedSessionsPerActiveUser: number | null;
  averageEngagementTimePerSession: number | null;
};
export type OverviewData = {
  metrics: OverviewMetrics;
  appVersions: string[];
  countries: string[];
  timeZone?: string | null;
  funnels: Array<{
    id: string;
    name: string;
    method?: "sequential" | "independent";
    events: Array<{
      eventName: string;
      activeUsers: number;
      eventCount: number;
      dropPercentage: number | null;
    }>;
  }>;
};
