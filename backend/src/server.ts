import { app } from "./app";
import { config } from "./config/env";
import { startScheduler } from "./workers/scheduler";

const server = app.listen(config.PORT, () => {
  console.log(`API listening at ${config.BACKEND_URL}`);
});

startScheduler();

function shutdown(): void {
  server.close(() => process.exit(0));
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
