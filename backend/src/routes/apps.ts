import { Router } from "express";
import { prisma } from "../config/prisma";
import { requireAuth } from "../middleware/auth";
import { createAppSchema } from "../schemas/app";
import { getOwnedApp, listApps } from "../services/apps";

export const appsRouter = Router();
appsRouter.use(requireAuth);

appsRouter.get("/", async (req, res, next) => {
  try {
    res.json(await listApps(req.profileId!));
  } catch (error) {
    next(error);
  }
});

appsRouter.post("/", async (req, res, next) => {
  try {
    const data = createAppSchema.parse(req.body);
    const app = await prisma.app.create({
      data: {
        name: data.name,
        ga4PropertyId: data.ga4PropertyId || null,
        ownerProfileId: req.profileId!,
      },
    });
    res.status(201).json(app);
  } catch (error) {
    next(error);
  }
});

appsRouter.patch("/:appId", async (req, res, next) => {
  try {
    await getOwnedApp(req.params.appId, req.profileId!);
    const data = createAppSchema.partial().parse(req.body);
    res.json(await prisma.app.update({
      where: { id: req.params.appId },
      data: { ...data, ga4PropertyId: data.ga4PropertyId === "" ? null : data.ga4PropertyId },
    }));
  } catch (error) {
    next(error);
  }
});

appsRouter.delete("/:appId", async (req, res, next) => {
  try {
    await getOwnedApp(req.params.appId, req.profileId!);
    await prisma.app.delete({ where: { id: req.params.appId } });
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});
