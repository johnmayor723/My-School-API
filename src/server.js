const app = require("./app");
const env = require("./config/env");
const logger = require("./config/logger");
const { connectDb } = require("./config/db");

async function start() {
  await connectDb();
  app.listen(env.port, () => {
    logger.info(`My School Placement API listening on port ${env.port}`, { basePath: env.apiBasePath });
  });
}

start().catch((err) => {
  logger.error("Failed to start server", { error: err.message, stack: err.stack });
  process.exit(1);
});
