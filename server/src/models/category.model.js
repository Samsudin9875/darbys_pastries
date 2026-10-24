const mongoose = require("mongoose");
const categorySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  slug: { type: String, required: true, trim: true, lowercase: true, unique: true, immutable: true },
  legacyKey: { type: String, required: true, trim: true, unique: true, immutable: true },
  active: { type: Boolean, default: true, index: true },
}, { timestamps: true, versionKey: false });
module.exports = mongoose.model("Category", categorySchema);
