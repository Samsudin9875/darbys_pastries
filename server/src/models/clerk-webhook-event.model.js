const mongoose = require("mongoose");

const clerkWebhookEventSchema = new mongoose.Schema({
  eventId: { type: String, required: true, unique: true, index: true },
  type: { type: String, required: true },
  status: { type: String, enum: ["processing", "completed"], default: "processing" },
}, { timestamps: true, versionKey: false });

module.exports = mongoose.model("ClerkWebhookEvent", clerkWebhookEventSchema);
