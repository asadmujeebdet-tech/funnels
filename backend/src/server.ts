import { app } from "./app";
import { config } from "./config/env";
import { prisma } from "./config/prisma";
import { SHARED_PROFILE_ID } from "./middleware/auth";
import { startScheduler } from "./workers/scheduler";

async function start(): Promise<void> {
  // Create one stable workspace identity for the existing ownership relations.
  // Reassigning existing apps preserves their funnels, reports, and sync history.
  const sharedProfile = await prisma.profile.upsert({
    where: { id: SHARED_PROFILE_ID },
    create: {
      id: SHARED_PROFILE_ID,
      googleSub: SHARED_PROFILE_ID,
      email: "operations-workspace@open-deploy.local",
      name: "Operations Workspace",
    },
    update: {
      email: "operations-workspace@open-deploy.local",
      name: "Operations Workspace",
    },
  });

  await prisma.app.updateMany({
    where: { ownerProfileId: { not: sharedProfile.id } },
    data: { ownerProfileId: sharedProfile.id },
  });

  const server = app.listen(config.PORT, () => {
    console.log(`API listening at ${config.BACKEND_URL}`);
  });

  startScheduler();

  function shutdown(): void {
    server.close(() => {
      void prisma.$disconnect().finally(() => process.exit(0));
    });
  }

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

start().catch((error: unknown) => {
  console.error("Could not initialize the shared workspace", error);
  process.exit(1);
});
