const { v2: cloudinary } = require("cloudinary");
const { cloudinaryCloudName, cloudinaryApiKey, cloudinaryApiSecret } = require("../../config/env");

const isCloudinaryConfigured = Boolean(cloudinaryCloudName && cloudinaryApiKey && cloudinaryApiSecret);

if (isCloudinaryConfigured) {
  cloudinary.config({ cloud_name: cloudinaryCloudName, api_key: cloudinaryApiKey, api_secret: cloudinaryApiSecret, secure: true });
}

function requireCloudinary() {
  if (!isCloudinaryConfigured) {
    const error = new Error("Cloudinary is not configured.");
    error.status = 503;
    error.code = "cloudinary_not_configured";
    throw error;
  }
  return cloudinary;
}

module.exports = { cloudinary, isCloudinaryConfigured, requireCloudinary };
