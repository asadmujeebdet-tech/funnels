export type Profile = { id: string; email: string; name: string | null };
export type Application = {
  id: string;
  name: string;
  ga4PropertyId: string | null;
  _count?: { features: number };
};
export type FeatureEvent = { id: string; eventName: string; position: number };
export type Feature = { id: string; name: string; events: FeatureEvent[] };
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
