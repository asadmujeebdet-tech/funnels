import { prisma } from "../config/prisma";
import { getAnalyticsClient } from "../integrations/google-analytics/client";

export async function runHistoricalSync(jobId: string): Promise<void> {
  const job = await prisma.syncJob.findUnique({
    where: { id: jobId },
    include: { app: true },
  });
  if (!job) {
    throw new Error(`Sync job ${jobId} was not found`);
  }
  if (!job.app.ga4PropertyId) {
    throw new Error("Set a GA4 property ID before synchronizing");
  }

  await prisma.syncJob.update({
    where: { id: jobId },
    data: { status: "running", startedAt: new Date(), error: null },
  });

  try {
    const client = await getAnalyticsClient(job.app.ownerProfileId);
    const startDate = new Date();
    startDate.setUTCDate(startDate.getUTCDate() - 90);
    startDate.setUTCHours(0, 0, 0, 0);
    const start = startDate.toISOString().slice(0, 10);
    const end = new Date().toISOString().slice(0, 10);
    const [report] = await client.runReport({
      property: `properties/${job.app.ga4PropertyId}`,
      dateRanges: [{ startDate: start, endDate: end }],
      dimensions: [{ name: "date" }, { name: "eventName" }, { name: "appVersion" }],
      metrics: [{ name: "activeUsers" }, { name: "eventCount" }],
      limit: 100000,
    });

    const facts = (report.rows ?? []).flatMap((row) => {
      const dateValue = row.dimensionValues?.[0]?.value;
      const eventName = row.dimensionValues?.[1]?.value;
      if (!dateValue || !eventName || !/^\d{8}$/.test(dateValue)) {
        return [];
      }
      const day = new Date(`${dateValue.slice(0, 4)}-${dateValue.slice(4, 6)}-${dateValue.slice(6, 8)}T00:00:00.000Z`);
      return [{
        appsId: job.appsId,
        date: day,
        eventName,
        appVersion: row.dimensionValues?.[2]?.value || "(not set)",
        activeUsers: Number(row.metricValues?.[0]?.value ?? 0),
        eventCount: Number(row.metricValues?.[1]?.value ?? 0),
      }];
    });

    await prisma.$transaction(async (transaction) => {
      await transaction.factGa4EventDaily.deleteMany({
        where: { appsId: job.appsId, date: { gte: startDate, lte: new Date(`${end}T00:00:00.000Z`) } },
      });
      for (let offset = 0; offset < facts.length; offset += 1000) {
        await transaction.factGa4EventDaily.createMany({ data: facts.slice(offset, offset + 1000) });
      }
      await transaction.syncJob.update({
        where: { id: jobId },
        data: { status: "completed", completedAt: new Date() },
      });
    });
  } catch (error) {
    await prisma.syncJob.update({
      where: { id: jobId },
      data: {
        status: "failed",
        completedAt: new Date(),
        error: error instanceof Error ? error.message.slice(0, 1000) : "Unexpected synchronization failure",
      },
    });
    throw error;
  }
}
