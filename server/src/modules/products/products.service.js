const mongoose = require("mongoose");
const Product = require("../../models/product.model");
const ProductVariant = require("../../models/product-variant.model");
const { mainCategories, cakeSubcategories, occasions } = require("../../utils/product-taxonomy");

const productPopulate = [
  { path: "category", select: "name slug legacyKey" },
  { path: "variants", match: { active: true }, select: "label weightGrams price currency stockQuantity active" },
];

function listValues(value) {
  return typeof value === "string" ? value.split(",").map((item) => item.trim()).filter(Boolean) : [];
}

function buildProductQuery({ category, mainCategory, cakeSubcategory, occasion, theme, featured, search, hasTheme, hasOccasionOrTheme } = {}) {
  const categories = listValues(mainCategory);
  if ((category && (typeof category !== "string" || !/^[a-z0-9-]{1,50}$/i.test(category)))
    || categories.length > 4 || categories.some((item) => !mainCategories.has(item))
    || (cakeSubcategory && !cakeSubcategories.has(cakeSubcategory))
    || (occasion && !occasions.has(occasion))
    || (theme && (typeof theme !== "string" || theme.trim().length > 50))
    || (search && (typeof search !== "string" || search.trim().length > 100))
    || (featured !== undefined && !["true", "false"].includes(String(featured)))
    || (hasTheme !== undefined && !["true", "false"].includes(String(hasTheme)))
    || (hasOccasionOrTheme !== undefined && !["true", "false"].includes(String(hasOccasionOrTheme)))) {
    const error = new Error("Choose valid product filters.");
    error.status = 400;
    throw error;
  }
  const query = { active: true };
  const filters = [];
  if (category && mainCategories.has(category)) {
    filters.push({ $or: [
      { mainCategory: category },
      { mainCategory: null, legacyCategoryKey: { $in: category === "cakes" ? ["classic", "chocolate", "fruit", "special", "photo", "custom", "birthday", "desserts"] : [category] } },
    ] });
  } else if (category && cakeSubcategories.has(category)) {
    const legacyKeys = category === "photo" ? ["photo", "custom"] : category === "custom" ? [] : [category];
    const legacyFallback = { mainCategory: null, cakeSubcategory: null, legacyCategoryKey: { $in: legacyKeys } };
    if (category === "fruit") legacyFallback.name = { $not: /rasmalai/i };
    filters.push({ $or: [
      { cakeSubcategory: category },
      legacyFallback,
    ] });
  } else if (category) {
    query.legacyCategoryKey = category === "cake-accessories" ? "accessories" : category;
  }
  if (categories.length === 1) {
    const [mainCategoryValue] = categories;
    filters.push({ $or: [
      { mainCategory: mainCategoryValue },
      { mainCategory: null, legacyCategoryKey: { $in: mainCategoryValue === "cakes" ? ["classic", "chocolate", "fruit", "special", "photo", "custom", "birthday", "desserts"] : [mainCategoryValue] } },
    ] });
  } else if (categories.length > 1) {
    const legacyCategories = categories.flatMap((item) => item === "cakes"
      ? ["classic", "chocolate", "fruit", "special", "photo", "custom", "birthday", "desserts"]
      : [item]);
    filters.push({ $or: [
      { mainCategory: { $in: categories } },
      { mainCategory: null, legacyCategoryKey: { $in: legacyCategories } },
    ] });
  }
  if (cakeSubcategory) {
    const legacyKeys = cakeSubcategory === "photo" ? ["photo", "custom"] : cakeSubcategory === "custom" ? [] : [cakeSubcategory];
    const legacyFallback = { mainCategory: null, cakeSubcategory: null, legacyCategoryKey: { $in: legacyKeys } };
    if (cakeSubcategory === "fruit") legacyFallback.name = { $not: /rasmalai/i };
    filters.push({ $or: [
      { cakeSubcategory },
      legacyFallback,
    ] });
  }
  if (occasion) {
    filters.push({ $or: [
      { occasionIds: occasion },
      { mainCategory: null, occasionIds: { $size: 0 }, legacyCategoryKey: occasion },
    ] });
  }
  if (theme) {
    query.themes = theme.trim();
    filters.push({ mainCategory: "cakes" });
  }
  if (hasTheme === "true") {
    query.themes = { $exists: true, $ne: [] };
    filters.push({ mainCategory: "cakes" });
  } else if (hasTheme === "false") {
    query.$or = [{ themes: { $exists: false } }, { themes: { $size: 0 } }];
  }
  if (hasOccasionOrTheme === "true") {
    filters.push({
      $or: [
        { mainCategory: "cakes", $or: [
          { occasionIds: { $exists: true, $ne: [] } },
          { themes: { $exists: true, $ne: [] } },
        ] },
        { mainCategory: null, legacyCategoryKey: { $in: [...occasions] } },
      ],
    });
  }
  if (filters.length) query.$and = filters;
  if (search?.trim()) query.name = { $regex: search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" };
  if (featured === "true") query.featured = true;
  return query;
}

async function listProducts(filters) {
  return Product.find(buildProductQuery(filters)).sort({ name: 1 }).populate(productPopulate).lean();
}

function parseBound(value, name) {
  if (value === undefined || value === "") return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 10000000) {
    const error = new Error(`Choose a valid ${name}.`);
    error.status = 400;
    throw error;
  }
  return parsed;
}

async function findProducts({ page = "1", limit = "24", sort = "name", minPrice, maxPrice, available, ...filters } = {}) {
  const pageNumber = Number(page);
  const pageSize = Number(limit);
  const min = parseBound(minPrice, "minimum price");
  const max = parseBound(maxPrice, "maximum price");
  if (!Number.isInteger(pageNumber) || pageNumber < 1
    || !Number.isInteger(pageSize) || pageSize < 1 || pageSize > 50
    || !["name", "price-asc", "price-desc"].includes(sort)
    || (available !== undefined && !["true", "false"].includes(String(available)))
    || (min !== null && max !== null && min > max)) {
    const error = new Error("Choose valid product listing options.");
    error.status = 400;
    throw error;
  }

  const pipeline = [
    { $match: buildProductQuery(filters) },
    { $lookup: { from: ProductVariant.collection.name, localField: "variants", foreignField: "_id", as: "_listingVariants" } },
    { $addFields: {
      _activeVariants: { $filter: { input: "$_listingVariants", as: "variant", cond: { $eq: ["$$variant.active", true] } } },
    } },
    { $addFields: {
      _minPrice: { $min: "$_activeVariants.price" },
      _hasAvailableVariant: { $anyElementTrue: [{ $map: { input: "$_activeVariants", as: "variant", in: { $or: [{ $eq: ["$$variant.stockQuantity", null] }, { $gt: ["$$variant.stockQuantity", 0] }] } } }] },
      _hasPriceInRange: { $anyElementTrue: [{ $map: { input: "$_activeVariants", as: "variant", in: { $and: [
        min === null ? true : { $gte: ["$$variant.price", min] },
        max === null ? true : { $lte: ["$$variant.price", max] },
      ] } } }] },
    } },
  ];
  if (available === "true") pipeline.push({ $match: { _hasAvailableVariant: true } });
  if (available === "false") pipeline.push({ $match: { _hasAvailableVariant: false } });
  if (min !== null || max !== null) pipeline.push({ $match: { _hasPriceInRange: true } });
  pipeline.push(
    { $sort: sort === "name" ? { name: 1, _id: 1 } : { _minPrice: sort === "price-asc" ? 1 : -1, _id: 1 } },
    { $facet: {
      products: [{ $skip: (pageNumber - 1) * pageSize }, { $limit: pageSize }, { $project: { _listingVariants: 0, _activeVariants: 0, _minPrice: 0, _hasAvailableVariant: 0, _hasPriceInRange: 0 } }],
      count: [{ $count: "total" }],
    } },
  );
  const [result = { products: [], count: [] }] = await Product.aggregate(pipeline);
  const ids = result.products.map((product) => product._id);
  const populated = ids.length
    ? await Product.find({ _id: { $in: ids } }).populate(productPopulate).lean()
    : [];
  const byId = new Map(populated.map((product) => [String(product._id), product]));
  return {
    data: ids.map((id) => byId.get(String(id))).filter(Boolean),
    pagination: { page: pageNumber, limit: pageSize, total: result.count[0]?.total || 0, pages: Math.ceil((result.count[0]?.total || 0) / pageSize) },
  };
}

async function getProductFacets() {
  const themes = await Product.aggregate([
    { $match: { active: true, mainCategory: "cakes", themes: { $exists: true, $ne: [] } } },
    { $unwind: "$themes" },
    { $group: { _id: { $toLower: "$themes" }, value: { $first: "$themes" } } },
    { $sort: { value: 1 } },
    { $project: { _id: 0, value: 1 } },
  ]);
  return { themes: themes || [] };
}

async function getProductById(identifier) {
  const query = mongoose.isObjectIdOrHexString(identifier)
    ? { _id: identifier, active: true }
    : { slug: identifier, active: true };
  return Product.findOne(query).populate(productPopulate).lean();
}

module.exports = { buildProductQuery, findProducts, getProductById, getProductFacets, listProducts };
