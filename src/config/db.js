const mongoose = require("mongoose");
const env = require("./env");
const logger = require("./logger");

mongoose.set("strictQuery", true);

async function connectDb() {
  mongoose.connection.on("connected", () => logger.info("MongoDB connected", { uri: env.mongodbUri.replace(/\/\/.*@/, "//***@") }));
  mongoose.connection.on("error", (err) => logger.error("MongoDB connection error", { error: err.message }));
  mongoose.connection.on("disconnected", () => logger.warn("MongoDB disconnected"));

  await mongoose.connect(env.mongodbUri, {
    serverSelectionTimeoutMS: 10000,
  });

  return mongoose.connection;
}

async function disconnectDb() {
  await mongoose.disconnect();
}

module.exports = { connectDb, disconnectDb, mongoose };
