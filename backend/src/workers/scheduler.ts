import cron from "node-cron";
import { config } from "../config/env";
import { prisma } from "../config/prisma";
import { runHistoricalSync } from "../services/sync";

export function startScheduler(): void {
  if (config.SYNC_ENABLED.toLowerCase() !== "true") {
    return;
  }
  cron.schedule("0 2 * * *", async () => {
    const apps = await prisma.app.findMany({
      where: { ga4PropertyId: { not: null } },
      select: { id: true, ownerProfileId: true },
    });
    for (const app of apps) {
      const job = await prisma.syncJob.create({ data: { appsId: app.id } });
      try {
        await runHistoricalSync(job.id);
      } catch (error) {
        console.error(`Scheduled GA4 sync failed for app ${app.id}`, error);
      }
    }
  }, { timezone: config.SYNC_TIMEZONE });
}
