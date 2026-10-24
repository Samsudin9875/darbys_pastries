const mongoose = require("mongoose");
const imageSchema = new mongoose.Schema({
  url: { type: String, required: true, trim: true },
  localUrl: { type: String, default: "", trim: true },
  secure_url: { type: String, default: "", trim: true },
  public_id: { type: String, default: "", trim: true },
  alt: { type: String, required: true, trim: true, maxlength: 180 },
}, { _id: false });
const productSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 140 },
  slug: { type: String, required: true, trim: true, lowercase: true, unique: true, immutable: true },
  description: { type: String, default: "", maxlength: 2000 },
  category: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true, index: true },
  legacyCategoryKey: { type: String, required: true, trim: true, index: true },
  subcategory: { type: String, default: "", trim: true, maxlength: 100 },
  images: { type: [imageSchema], default: [] },
  flavour: { type: String, default: "", trim: true, maxlength: 100 },
  dietary: { containsEgg: { type: Boolean, default: true }, egglessAvailable: { type: Boolean, default: false } },
  customization: { messageAvailable: { type: Boolean, default: false }, photoAvailable: { type: Boolean, default: false }, themeAvailable: { type: Boolean, default: false } },
  variants: [{ type: mongoose.Schema.Types.ObjectId, ref: "ProductVariant" }],
  active: { type: Boolean, default: true, index: true },
  featured: { type: Boolean, default: false, index: true },
}, { timestamps: true, versionKey: false });
productSchema.index({ category: 1, active: 1, name: 1 });
productSchema.index({ featured: 1, active: 1 });
module.exports = mongoose.model("Product", productSchema);
