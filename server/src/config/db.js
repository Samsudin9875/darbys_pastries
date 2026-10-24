const mongoose = require("mongoose");
const { mongoUri } = require("./env");

async function connectDatabase() {
  if (!mongoUri) {
    const error = new Error("MONGODB_URI must be configured before starting the API.");
    error.code = "database_configuration_error";
    throw error;
  }
  mongoose.connection.on("error", (error) => console.error("MongoDB connection error:", error.message));
  await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 10000 });
  console.log(`MongoDB connected: ${mongoose.connection.host}/${mongoose.connection.name}`);
}

async function disconnectDatabase() { await mongoose.disconnect(); }
module.exports = { connectDatabase, disconnectDatabase };
