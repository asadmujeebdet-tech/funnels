import { Router } from "express";
import { buildJourney } from "../analytics/journey";
import { aggregateCampaignReports } from "../analytics/campaign-aggregation";
import { prisma } from "../config/prisma";
import { requireAuth } from "../middleware/auth";
import { enforceGaQuota } from "../middleware/ga-quota";
import { dateRangeSchema } from "../schemas/app";
import { getAnalyticsClient, getFunnelClient } from "../integrations/google-analytics/client";
import {
  discoverEvents,
  getCampaignCosts,
  getEventPopulations,
  getFunnelUsers,
  getOverviewChoices,
  getOverviewMetrics,
  validateProperty,
} from "../integrations/google-analytics/reports";
import { getOwnedApp, listApps } from "../services/apps";
import { runHistoricalSync } from "../services/sync";

export const analyticsRouter = Router();
analyticsRouter.use(requireAuth, enforceGaQuota);

analyticsRouter.post("/apps/:appId/ga4/validate-property", async (req, res, next) => {
  try {
    const app = await getOwnedApp(req.params.appId, req.profileId!);
    const propertyId = String(req.body?.propertyId ?? "").trim();
    if (!/^\d+$/.test(propertyId)) {
      res.status(400).json({ error: "A numeric GA4 property ID is required" });
      return;
    }
    const client = await getAnalyticsClient(req.profileId!);
    await validateProperty(client, propertyId);
    const updated = await prisma.app.update({ where: { id: app.id }, data: { ga4PropertyId: propertyId } });
    res.json({ valid: true, app: updated });
  } catch (error) {
    next(error);
  }
});

analyticsRouter.get("/ga4/campaigns", async (req, res, next) => {
  try {
    const range = dateRangeSchema.parse(req.query);
    const apps = (await listApps(req.profileId!)).filter((app) => app.ga4PropertyId);
    if (!apps.length) {
      res.status(400).json({ error: "Add and validate a GA4 Property ID for at least one app before viewing campaigns." });
      return;
    }
    const client = await getAnalyticsClient(req.profileId!);
    const reports = await Promise.all(apps.map(async (app) => {
      const { campaigns, currency } = await getCampaignCosts(client, app.ga4PropertyId!, range.startDate, range.endDate);
      return { currency, campaigns };
    }));
    const aggregated = aggregateCampaignReports(reports);
    res.json({
      startDate: range.startDate,
      endDate: range.endDate,
      ...aggregated,
    });
  } catch (error) {
    next(error);
  }
});

analyticsRouter.get("/apps/:appId/ga4/events", async (req, res, next) => {
  try {
    const app = await getOwnedApp(req.params.appId, req.profileId!);
    if (!app.ga4PropertyId) {
      res.status(400).json({ error: "Validate a GA4 property ID first" });
      return;
    }
    const range = dateRangeSchema.parse(req.query);
    const client = await getAnalyticsClient(req.profileId!);
    const events = await discoverEvents(client, app.ga4PropertyId, range.startDate, range.endDate, range.appVersion);
    res.json({ events });
  } catch (error) {
    next(error);
  }
});

analyticsRouter.get("/apps/:appId/ga4/campaigns", async (req, res, next) => {
  try {
    const app = await getOwnedApp(req.params.appId, req.profileId!);
    if (!app.ga4PropertyId) {
      res.status(400).json({ error: "Validate a GA4 property ID first" });
      return;
    }
    const range = dateRangeSchema.parse(req.query);
    const client = await getAnalyticsClient(req.profileId!);
    const { campaigns, currency, trend } = await getCampaignCosts(client, app.ga4PropertyId, range.startDate, range.endDate);
    const availableCosts = campaigns
      .map((campaign) => campaign.cost)
      .filter((cost): cost is number => cost !== null);
    res.json({
      startDate: range.startDate,
      endDate: range.endDate,
      currency,
      totalCost: availableCosts.length === campaigns.length && availableCosts.length > 0
        ? availableCosts.reduce((sum, cost) => sum + cost, 0)
        : null,
      campaigns: campaigns.map(({ campaign, cost, impressions, clicks, ctr, cpc, trend: campaignTrend }) => ({
        campaign,
        cost,
        impressions,
        clicks,
        ctr,
        cpc,
        trend: campaignTrend,
      })),
      trend,
    });
  } catch (error) {
    next(error);
  }
});

analyticsRouter.get("/apps/:appId/ga4/overview", async (req, res, next) => {
  try {
    const app = await getOwnedApp(req.params.appId, req.profileId!);
    if (!app.ga4PropertyId) {
      res.status(400).json({ error: "Validate a GA4 property ID first" });
      return;
    }
    const range = dateRangeSchema.parse(req.query);
    const client = await getAnalyticsClient(req.profileId!);
    const features = await prisma.feature.findMany({
      where: { appsId: app.id },
      include: { events: { orderBy: { position: "asc" } } },
      orderBy: { createdAt: "asc" },
    });
    const eventNames = [...new Set(features.flatMap((feature) => feature.events.map((event) => event.eventName)))];
    const funnelClient = await getFunnelClient(req.profileId!);
    const [metrics, choices, populations, funnelUsers] = await Promise.all([
      getOverviewMetrics(client, app.ga4PropertyId, range.startDate, range.endDate, range.appVersion, range.country),
      getOverviewChoices(client, app.ga4PropertyId, range.startDate, range.endDate),
      eventNames.length
        ? getEventPopulations(client, app.ga4PropertyId, eventNames, range.startDate, range.endDate, range.appVersion, range.country)
        : Promise.resolve(new Map()),
      Promise.all(features.map((feature) => getFunnelUsers(
        funnelClient,
        app.ga4PropertyId!,
        feature.events.map((event) => event.eventName),
        range.startDate,
        range.endDate,
        range.appVersion,
      ))),
    ]);
    res.json({
      metrics,
      appVersions: choices.appVersions,
      countries: choices.countries,
      timeZone: choices.timeZone,
      funnels: features.map((feature, featureIndex) => {
        const names = feature.events.map((event) => event.eventName);
        const users = funnelUsers[featureIndex];
        // Sequential funnel users when available, otherwise independent per-event users.
        const featurePopulations = users
          ? new Map(names.map((name, index) => [name, {
            eventName: name,
            activeUsers: users[index] ?? 0,
            eventCount: populations.get(name)?.eventCount ?? 0,
          }]))
          : populations;
        return {
        id: feature.id,
        name: feature.name,
        method: users ? "sequential" : "independent",
        events: buildJourney(names, featurePopulations)
          .map(({ eventName, activeUsers, eventCount, dropPercentage }) => ({
            eventName,
            activeUsers,
            eventCount,
            dropPercentage,
          })),
        };
      }),
    });
  } catch (error) {
    next(error);
  }
});

analyticsRouter.get("/apps/:appId/features/:featureId/journey", async (req, res, next) => {
  try {
    const app = await getOwnedApp(req.params.appId, req.profileId!);
    if (!app.ga4PropertyId) {
      res.status(400).json({ error: "Validate a GA4 property ID first" });
      return;
    }
    const range = dateRangeSchema.parse(req.query);
    const feature = await prisma.feature.findFirst({
      where: { id: req.params.featureId, appsId: app.id },
      include: { events: { orderBy: { position: "asc" } } },
    });
    if (!feature) {
      res.status(404).json({ error: "Feature not found" });
      return;
    }
    const client = await getAnalyticsClient(req.profileId!);
    const populations = await getEventPopulations(
      client,
      app.ga4PropertyId,
      feature.events.map((event) => event.eventName),
      range.startDate,
      range.endDate,
      range.appVersion,
    );
    res.json({
      feature: { id: feature.id, name: feature.name },
      startDate: range.startDate,
      endDate: range.endDate,
      appVersion: range.appVersion ?? null,
      comparisonType: "aggregated_event_populations",
      events: buildJourney(feature.events.map((event) => event.eventName), populations),
    });
  } catch (error) {
    next(error);
  }
});

analyticsRouter.post("/apps/:appId/sync", async (req, res, next) => {
  try {
    const app = await getOwnedApp(req.params.appId, req.profileId!);
    if (!app.ga4PropertyId) {
      res.status(400).json({ error: "Validate a GA4 property ID first" });
      return;
    }
    const job = await prisma.syncJob.create({ data: { appsId: app.id } });
    void runHistoricalSync(job.id).catch((error: unknown) => {
      console.error(`Historical GA4 sync failed for job ${job.id}`, error);
    });
    res.status(202).json(job);
  } catch (error) {
    next(error);
  }
});

analyticsRouter.get("/apps/:appId/sync", async (req, res, next) => {
  try {
    const app = await getOwnedApp(req.params.appId, req.profileId!);
    res.json(await prisma.syncJob.findMany({
      where: { appsId: app.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    }));
  } catch (error) {
    next(error);
  }
});

analyticsRouter.get("/apps/:appId/reports", async (req, res, next) => {
  try {
    const app = await getOwnedApp(req.params.appId, req.profileId!);
    res.json(await prisma.savedReport.findMany({ where: { appsId: app.id }, orderBy: { updatedAt: "desc" } }));
  } catch (error) {
    next(error);
  }
});

analyticsRouter.post("/apps/:appId/reports", async (req, res, next) => {
  try {
    const app = await getOwnedApp(req.params.appId, req.profileId!);
    const name = String(req.body?.name ?? "").trim();
    if (!name || name.length > 120 || !req.body?.config || typeof req.body.config !== "object") {
      res.status(400).json({ error: "A report name and configuration object are required" });
      return;
    }
    const report = await prisma.savedReport.create({
      data: { appsId: app.id, name, config: req.body.config },
    });
    res.status(201).json(report);
  } catch (error) {
    next(error);
  }
});
