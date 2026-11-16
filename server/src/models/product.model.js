const mongoose = require("mongoose");
const { mainCategories, cakeSubcategories } = require("../utils/product-taxonomy");
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
  mainCategory: { type: String, enum: [...mainCategories], default: null, index: true },
  cakeSubcategory: { type: String, enum: [...cakeSubcategories, null], default: null, index: true },
  subcategory: { type: String, default: "", trim: true, maxlength: 100 },
  images: { type: [imageSchema], default: [] },
  occasionIds: {
    type: [{ type: String, trim: true, lowercase: true }],
    default: [],
    validate: {
      validator: (occasionIds) => occasionIds.length <= 12
        && occasionIds.every((id) => /^[a-z0-9-]{1,50}$/.test(id))
        && new Set(occasionIds).size === occasionIds.length,
      message: "Choose valid product occasions.",
    },
  },
  themes: {
    type: [{ type: String, trim: true, maxlength: 50 }],
    default: [],
    validate: {
      validator: (themes) => themes.length <= 12 && new Set(themes.map((theme) => theme.toLowerCase())).size === themes.length,
      message: "Choose up to 12 unique product themes.",
    },
  },
  flavour: { type: String, default: "", trim: true, maxlength: 100 },
  dietary: { containsEgg: { type: Boolean, default: true }, egglessAvailable: { type: Boolean, default: false } },
  customization: { messageAvailable: { type: Boolean, default: false }, photoAvailable: { type: Boolean, default: false }, themeAvailable: { type: Boolean, default: false } },
  variants: [{ type: mongoose.Schema.Types.ObjectId, ref: "ProductVariant" }],
  active: { type: Boolean, default: true, index: true },
  archivedAt: { type: Date, default: null, index: true },
  featured: { type: Boolean, default: false, index: true },
}, { timestamps: true, versionKey: false });
productSchema.index({ category: 1, active: 1, name: 1 });
productSchema.index({ mainCategory: 1, cakeSubcategory: 1, active: 1 });
productSchema.index({ occasionIds: 1, active: 1 });
productSchema.index({ themes: 1, active: 1 });
productSchema.index({ featured: 1, active: 1 });
module.exports = mongoose.model("Product", productSchema);
