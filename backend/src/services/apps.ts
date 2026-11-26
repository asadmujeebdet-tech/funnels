import { prisma } from "../config/prisma";

export function listApps(profileId: string) {
  return prisma.app.findMany({
    where: { ownerProfileId: profileId },
    include: { _count: { select: { features: true } } },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getOwnedApp(appId: string, profileId: string) {
  const app = await prisma.app.findFirst({ where: { id: appId, ownerProfileId: profileId } });
  if (!app) {
    throw Object.assign(new Error("Application not found"), { status: 404 });
  }
  return app;
}
