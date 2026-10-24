const mongoose = require("mongoose");

const siteSettingSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true, trim: true },
  value: { type: mongoose.Schema.Types.Mixed, required: true },
}, { timestamps: true, versionKey: false });

module.exports = mongoose.model("SiteSetting", siteSettingSchema);
