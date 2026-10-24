require("dotenv").config();

const port = Number(process.env.PORT || 3000);
const clientOrigin = process.env.CLIENT_ORIGIN || "http://localhost:5173";
const nodeEnv = process.env.NODE_ENV || "development";
const mongoUri = process.env.MONGODB_URI || "";
const clerkSecretKey = process.env.CLERK_SECRET_KEY || "";
const clerkWebhookSigningSecret = process.env.CLERK_WEBHOOK_SIGNING_SECRET || "";
const cloudinaryCloudName = process.env.CLOUDINARY_CLOUD_NAME || "";
const cloudinaryApiKey = process.env.CLOUDINARY_API_KEY || "";
const cloudinaryApiSecret = process.env.CLOUDINARY_API_SECRET || "";
const adminEmail = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("PORT must be a valid TCP port.");
}

if (nodeEnv === "production" && !clerkSecretKey) {
  throw new Error("CLERK_SECRET_KEY must be configured in production.");
}
if (nodeEnv === "production" && !clerkWebhookSigningSecret) {
  throw new Error("CLERK_WEBHOOK_SIGNING_SECRET must be configured in production.");
}
if (nodeEnv === "production" && (!cloudinaryCloudName || !cloudinaryApiKey || !cloudinaryApiSecret)) {
  throw new Error("Cloudinary credentials must be configured in production.");
}

module.exports = { port, clientOrigin, nodeEnv, clerkSecretKey, clerkWebhookSigningSecret, mongoUri, cloudinaryCloudName, cloudinaryApiKey, cloudinaryApiSecret, adminEmail };
