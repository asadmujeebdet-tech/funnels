import { Router } from "express";
import { buildJourney } from "../analytics/journey";
import { prisma } from "../config/prisma";
import { requireAuth } from "../middleware/auth";
import { enforceGaQuota } from "../middleware/ga-quota";
import { dateRangeSchema } from "../schemas/app";
import { getAnalyticsClient } from "../integrations/google-analytics/client";
import { discoverEvents, getEventPopulations, validateProperty } from "../integrations/google-analytics/reports";
import { getOwnedApp } from "../services/apps";
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
