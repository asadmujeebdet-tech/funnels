import { Router } from "express";
import { prisma } from "../config/prisma";
import { requireAuth } from "../middleware/auth";
import { createFeatureSchema, updateFeatureSchema } from "../schemas/app";
import { getOwnedApp } from "../services/apps";

export const featuresRouter = Router();
featuresRouter.use(requireAuth);

featuresRouter.get("/apps/:appId/features", async (req, res, next) => {
  try {
    await getOwnedApp(req.params.appId, req.profileId!);
    const features = await prisma.feature.findMany({
      where: { appsId: req.params.appId },
      include: { events: { orderBy: { position: "asc" } } },
      orderBy: { createdAt: "asc" },
    });
    res.json(features);
  } catch (error) {
    next(error);
  }
});

featuresRouter.post("/apps/:appId/features", async (req, res, next) => {
  try {
    await getOwnedApp(req.params.appId, req.profileId!);
    const data = createFeatureSchema.parse(req.body);
    const feature = await prisma.feature.create({
      data: {
        appsId: req.params.appId,
        name: data.name,
        events: { create: data.events.map((eventName, position) => ({ eventName, position })) },
      },
      include: { events: { orderBy: { position: "asc" } } },
    });
    res.status(201).json(feature);
  } catch (error) {
    next(error);
  }
});

featuresRouter.put("/features/:featureId/events", async (req, res, next) => {
  try {
    const feature = await prisma.feature.findFirst({
      where: { id: req.params.featureId, app: { ownerProfileId: req.profileId } },
    });
    if (!feature) {
      res.status(404).json({ error: "Feature not found" });
      return;
    }
    const { events } = createFeatureSchema.pick({ events: true }).parse(req.body);
    await prisma.$transaction([
      prisma.featureEvent.deleteMany({ where: { featureId: feature.id } }),
      prisma.featureEvent.createMany({
        data: events.map((eventName, position) => ({ featureId: feature.id, eventName, position })),
      }),
    ]);
    res.json(await prisma.feature.findUnique({
      where: { id: feature.id },
      include: { events: { orderBy: { position: "asc" } } },
    }));
  } catch (error) {
    next(error);
  }
});

featuresRouter.patch("/features/:featureId", async (req, res, next) => {
  try {
    const feature = await prisma.feature.findFirst({
      where: { id: req.params.featureId, app: { ownerProfileId: req.profileId } },
    });
    if (!feature) {
      res.status(404).json({ error: "Feature not found" });
      return;
    }
    const data = updateFeatureSchema.parse(req.body);
    await prisma.$transaction(async (transaction) => {
      if (data.events !== undefined) {
        await transaction.featureEvent.deleteMany({ where: { featureId: feature.id } });
        await transaction.featureEvent.createMany({
          data: data.events.map((eventName, position) => ({ featureId: feature.id, eventName, position })),
        });
      }
      if (data.name !== undefined) {
        await transaction.feature.update({ where: { id: feature.id }, data: { name: data.name } });
      }
    });
    res.json(await prisma.feature.findUnique({
      where: { id: feature.id },
      include: { events: { orderBy: { position: "asc" } } },
    }));
  } catch (error) {
    next(error);
  }
});

featuresRouter.delete("/features/:featureId", async (req, res, next) => {
  try {
    const feature = await prisma.feature.findFirst({
      where: { id: req.params.featureId, app: { ownerProfileId: req.profileId } },
    });
    if (!feature) {
      res.status(404).json({ error: "Feature not found" });
      return;
    }
    await prisma.feature.delete({ where: { id: feature.id } });
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});
