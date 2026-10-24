const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  clerkUserId: { type: String, required: true, trim: true, unique: true, immutable: true, index: true },
  email: { type: String, required: true, trim: true, lowercase: true, maxlength: 320 },
  name: { type: String, default: "", trim: true, maxlength: 200 },
  phone: { type: String, default: "", trim: true, maxlength: 32 },
  role: { type: String, enum: ["customer", "admin"], default: "customer", required: true, index: true },
  deletedAt: { type: Date, default: null },
}, { timestamps: true, versionKey: false });

module.exports = mongoose.model("User", userSchema);
