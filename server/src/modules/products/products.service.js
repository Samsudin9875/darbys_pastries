const mongoose = require("mongoose");
const Product = require("../../models/product.model");

const productPopulate = [
  { path: "category", select: "name slug legacyKey" },
  { path: "variants", match: { active: true }, select: "label weightGrams price currency stockQuantity active" },
];

async function listProducts({ category, featured } = {}) {
  const query = { active: true };
  if (category) query.legacyCategoryKey = category;
  if (featured === "true") query.featured = true;
  return Product.find(query).sort({ name: 1 }).populate(productPopulate).lean();
}

async function getProductById(identifier) {
  const query = mongoose.isObjectIdOrHexString(identifier)
    ? { _id: identifier, active: true }
    : { slug: identifier, active: true };
  return Product.findOne(query).populate(productPopulate).lean();
}

module.exports = { getProductById, listProducts };
