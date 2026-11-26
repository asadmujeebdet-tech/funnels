import type { BetaAnalyticsDataClient } from "@google-analytics/data";
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
): Promise<Map<string, EventPopulation>> {
  const cacheKey = `populations:${propertyId}:${eventNames.join(",")}:${startDate}:${endDate}:${appVersion ?? ""}`;
  const cached = memoryCache.get<Array<[string, EventPopulation]>>(cacheKey);
  if (cached) {
    return new Map(cached);
  }

  const [report] = await client.runReport({
    property: `properties/${propertyId}`,
    dateRanges: [{ startDate, endDate }],
    dimensions: [{ name: "eventName" }],
    metrics: [{ name: "activeUsers" }, { name: "eventCount" }],
    dimensionFilter: versionFilter(appVersion),
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

export async function validateProperty(client: BetaAnalyticsDataClient, propertyId: string): Promise<void> {
  await client.getMetadata({ name: `properties/${propertyId}/metadata` });
}
