const mongoose = require("mongoose");
const productVariantSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true, index: true },
  label: { type: String, required: true, trim: true, maxlength: 40 },
  weightGrams: { type: Number, min: 0, default: null },
  price: { type: Number, required: true, min: 0 },
  currency: { type: String, default: "INR", enum: ["INR"] },
  stockQuantity: { type: Number, default: null, min: 0 },
  active: { type: Boolean, default: true, index: true },
}, { timestamps: true, versionKey: false });
productVariantSchema.index({ product: 1, label: 1 }, { unique: true });
module.exports = mongoose.model("ProductVariant", productVariantSchema);
