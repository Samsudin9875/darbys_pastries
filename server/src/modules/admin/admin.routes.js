const router = require("express").Router();
const requireAuth = require("../../middleware/require-auth");
const requireAdmin = require("../../middleware/require-admin");
const Product = require("../../models/product.model");
const Category = require("../../models/category.model");
const ProductVariant = require("../../models/product-variant.model");
const SiteSetting = require("../../models/site-setting.model");
const Order = require("../../models/order.model");
const { productImageUpload, uploadImage, destroyImage } = require("../../integrations/cloudinary/upload");
const {
  occasions,
  normalizeTaxonomy,
  normalizeStringList,
  readThemes,
  legacyKeyForProduct,
} = require("../../utils/product-taxonomy");
router.use(requireAuth, requireAdmin);
router.get("/", (_request, response) => response.json({ data: { message: "Admin API authentication is configured." } }));
router.get("/dashboard", async (_request, response, next) => {
  try {
    const [totalProducts, activeProducts, draftProducts, imageStats, recentProducts, orderStats] = await Promise.all([
      Product.countDocuments(), Product.countDocuments({ active: true }), Product.countDocuments({ active: false }),
      Product.aggregate([{ $project: { count: { $size: "$images" } } }, { $group: { _id: null, count: { $sum: "$count" } } }]),
      Product.find().sort({ updatedAt: -1 }).limit(5).select("name active updatedAt").lean(),
      Order.aggregate([{ $group: { _id: null, totalOrders: { $sum: 1 }, pendingOrders: { $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] } }, confirmedValue: { $sum: { $cond: [{ $in: ["$status", ["confirmed", "completed"]] }, "$total", 0] } }, paymentsCollected: { $sum: { $add: ["$advancePaid", "$remainingPaid"] } }, refunds: { $sum: "$refunded" } } }]),
    ]);
    const orders = orderStats[0] || {};
    response.json({ data: { totalProducts, activeProducts, draftProducts, totalImages: imageStats[0]?.count || 0, recentProducts, totalOrders: orders.totalOrders || 0, pendingOrders: orders.pendingOrders || 0, confirmedValue: orders.confirmedValue || 0, paymentsCollected: orders.paymentsCollected || 0, refunds: orders.refunds || 0, outstandingBalance: Math.max(0, (orders.confirmedValue || 0) - (orders.paymentsCollected || 0)) } });
  } catch (error) { next(error); }
});
router.get("/products", async (_request, response, next) => {
  try { response.json({ data: await Product.find().sort({ legacyCategoryKey: 1, name: 1 }).populate("category", "name legacyKey").populate("variants", "label price weightGrams stockQuantity active").lean() }); } catch (error) { next(error); }
});
router.get("/site-settings", async (_request, response, next) => {
  try { const setting = await SiteSetting.findOne({ key: "homepage" }).lean(); response.json({ data: setting?.value || null }); } catch (error) { next(error); }
});
router.put("/site-settings", async (request, response, next) => {
  try {
    const hero = request.body?.hero;
    const categories = request.body?.categories;
    const cakeMenuGroups = request.body?.cakeMenuGroups;
    let giftCategories = request.body?.giftCategories;
    const giftsVisible = request.body?.giftsVisible;
    const sectionVisibility = request.body?.sectionVisibility;
    const themeOptions = request.body?.themeOptions;
    const reviewHighlights = request.body?.reviewHighlights;
    const featuredProducts = request.body?.featuredProducts;
    if (Array.isArray(giftCategories)) {
      const defaults = [
        ["flowers", "Flowers", "Fresh blooms for every celebration"],
        ["chocolates", "Chocolates", "Sweet gifts, ready to share"],
        ["accessories", "Cake Accessories", "Birthday essentials and finishing touches"],
        ["gift-hampers", "Gift Hampers", "Curated celebration hampers, ready to gift"],
      ];
      giftCategories = defaults.map(([id, label, detail]) => {
        const card = giftCategories.find((item) => item?.id === id) || {};
        return { ...card, id, action: id, label: typeof card.label === "string" ? card.label : label, detail: typeof card.detail === "string" ? card.detail : detail, image: typeof card.image === "string" ? card.image : "", active: card.active !== false };
      });
    }
    if (hero && ["eyebrow", "title", "description", "badge", "image"].some((field) => typeof hero[field] !== "string" || hero[field].trim().length > 500)) {
      const error = new Error("Enter valid hero content."); error.status = 400; throw error;
    }
    const categoryIds = ["classic", "chocolate", "fruit", "special", "photo", "desserts"];
    if (categories && (!Array.isArray(categories) || categories.length !== categoryIds.length || categories.some((category, index) => !category || category.id !== categoryIds[index] || category.action !== categoryIds[index] || typeof category.label !== "string" || typeof category.detail !== "string" || typeof category.image !== "string" || category.label.length > 80 || category.detail.length > 300))) {
      const error = new Error("Enter valid category cards."); error.status = 400; throw error;
    }
    const cakeMenuGroupIds = new Set(["cakes"]);
    const expectedCakeMenu = {
      cakes: [
        ["classic", "Classic Cakes"], ["chocolate", "Chocolate Cakes"], ["fruit", "Fruit Cakes"],
        ["special", "Premium & Special Cakes"], ["photo", "Photo Cakes"], ["desserts", "Desserts"],
      ],
    };
    if (cakeMenuGroups && (
      !Array.isArray(cakeMenuGroups)
      || cakeMenuGroups.length !== 1
      || cakeMenuGroups.some((group) => !group || !cakeMenuGroupIds.has(group.id)
        || typeof group.title !== "string" || !group.title.trim() || group.title.length > 80
        || !Array.isArray(group.items)
        || group.items.length !== expectedCakeMenu[group.id].length
        || group.items.some((item, index) => !item || item.id !== expectedCakeMenu[group.id][index][0]
          || item.label !== expectedCakeMenu[group.id][index][1] || item.action !== expectedCakeMenu[group.id][index][0]))
      || new Set(cakeMenuGroups.map((group) => group?.id)).size !== 1
    )) {
      const error = new Error("Enter valid Cakes menu columns and links."); error.status = 400; throw error;
    }
    if (giftCategories && (!Array.isArray(giftCategories) || giftCategories.length > 4 || giftCategories.some((category) => !category?.id || typeof category.label !== "string" || typeof category.detail !== "string" || typeof category.image !== "string" || !["flowers", "chocolates", "accessories", "gift-hampers"].includes(category.action) || (category.active !== undefined && typeof category.active !== "boolean") || category.label.length > 80 || category.detail.length > 300))) {
      const error = new Error("Enter valid gift category cards."); error.status = 400; throw error;
    }
    if (giftsVisible !== undefined && typeof giftsVisible !== "boolean") { const error = new Error("Enter a valid gifts visibility setting."); error.status = 400; throw error; }
    if (sectionVisibility && (typeof sectionVisibility !== "object" || Array.isArray(sectionVisibility)
      || Object.values(sectionVisibility).some((value) => typeof value !== "boolean")
      || Object.keys(sectionVisibility).some((key) => !["bestSellers", "occasionTheme", "addOns", "reviews"].includes(key)))) {
      const error = new Error("Enter valid homepage section visibility settings."); error.status = 400; throw error;
    }
    if (themeOptions && (!Array.isArray(themeOptions) || themeOptions.length > 40
      || themeOptions.some((theme) => typeof theme !== "string" || !theme.trim() || theme.trim().length > 50)
      || new Set(themeOptions.map((theme) => theme.trim().toLowerCase())).size !== themeOptions.length)) {
      const error = new Error("Enter up to 40 unique theme options."); error.status = 400; throw error;
    }
    if (reviewHighlights && (!Array.isArray(reviewHighlights) || reviewHighlights.length > 3
      || reviewHighlights.some((review) => !review || typeof review.quote !== "string" || !review.quote.trim() || review.quote.length > 500
        || typeof review.name !== "string" || !review.name.trim() || review.name.length > 100
        || typeof review.place !== "string" || review.place.length > 100
        || !Number.isInteger(review.rating) || review.rating < 1 || review.rating > 5))) {
      const error = new Error("Enter up to three valid review highlights."); error.status = 400; throw error;
    }
    if (featuredProducts && (typeof featuredProducts !== "object" || Array.isArray(featuredProducts)
      || Object.keys(featuredProducts).some((key) => !["flowers", "chocolates", "accessories", "gift-hampers"].includes(key))
      || Object.values(featuredProducts).some((ids) => !Array.isArray(ids) || ids.length > 2 || ids.some((id) => !/^[a-f\d]{24}$/i.test(id)) || new Set(ids).size !== ids.length))) {
      const error = new Error("Choose up to two valid featured products per store category."); error.status = 400; throw error;
    }
    if (featuredProducts) {
      const selections = Object.entries(featuredProducts).flatMap(([category, ids]) => ids.map((id) => ({ id, category })));
      const selectedProducts = await Product.find({ _id: { $in: selections.map((entry) => entry.id) }, active: true }).select("_id mainCategory legacyCategoryKey").lean();
      const byId = new Map(selectedProducts.map((product) => [String(product._id), product]));
      if (selections.some(({ id, category }) => {
        const product = byId.get(id);
        return !product || (product.mainCategory || product.legacyCategoryKey) !== category;
      })) {
        const error = new Error("Featured add-on products must be published products in the selected category."); error.status = 400; throw error;
      }
    }
    if (!hero && !categories && !cakeMenuGroups && !giftCategories && giftsVisible === undefined && !sectionVisibility && !themeOptions && !reviewHighlights && !featuredProducts) { const error = new Error("Nothing to save."); error.status = 400; throw error; }
    const existing = await SiteSetting.findOne({ key: "homepage" }).lean();
    const value = { ...(existing?.value || {}) };
    if (hero) value.hero = Object.fromEntries(Object.entries(hero).map(([key, value]) => [key, value.trim()]));
    if (categories) value.categories = categories.map((category) => ({ ...category, label: category.label.trim(), detail: category.detail.trim() }));
    if (cakeMenuGroups) value.cakeMenuGroups = cakeMenuGroups.map((group) => ({
      ...group,
      title: group.title.trim(),
      items: group.items.map((item) => ({ ...item, label: item.label.trim() })),
    }));
    if (giftCategories) value.giftCategories = giftCategories.map((category) => ({ ...category, label: category.label.trim(), detail: category.detail.trim() }));
    if (giftsVisible !== undefined) value.giftsVisible = giftsVisible;
    if (sectionVisibility) value.sectionVisibility = { ...(value.sectionVisibility || {}), ...sectionVisibility };
    if (themeOptions) value.themeOptions = themeOptions.map((theme) => theme.trim());
    if (reviewHighlights) value.reviewHighlights = reviewHighlights.map((review) => ({ ...review, quote: review.quote.trim(), name: review.name.trim(), place: review.place.trim() }));
    if (featuredProducts) value.featuredProducts = featuredProducts;
    const setting = await SiteSetting.findOneAndUpdate({ key: "homepage" }, { value }, { upsert: true, new: true, runValidators: true });
    response.json({ data: setting.value });
  } catch (error) { next(error); }
});
router.post("/site-settings/hero-image/:field", productImageUpload.single("image"), async (request, response, next) => {
  try {
    const field = request.params.field;
    if (!["image", "imageSecond", "imageThird"].includes(field) || !request.file) { const error = new Error("Choose a valid homepage image."); error.status = 400; throw error; }
    const setting = await SiteSetting.findOne({ key: "homepage" });
    const value = setting?.value || {};
    const uploaded = await uploadImage(request.file, { folder: "cakes/homepage", publicId: `hero-${field}-${Date.now()}`, profile: "hero" });
    const hero = { ...(value.hero || {}), [field]: uploaded.secure_url };
    await SiteSetting.findOneAndUpdate({ key: "homepage" }, { value: { ...value, hero } }, { upsert: true, new: true, runValidators: true });
    response.status(201).json({ data: { field, url: uploaded.secure_url } });
  } catch (error) { next(error); }
});
router.post("/site-settings/category-image/:id", productImageUpload.single("image"), async (request, response, next) => {
  try {
    if (!request.file) { const error = new Error("Choose a category image."); error.status = 400; throw error; }
    const setting = await SiteSetting.findOne({ key: "homepage" });
    const value = setting?.value || {};
    // Gift cards must still be recognised when this is the first upload or
    // when an older homepage setting does not yet contain giftCategories.
    const giftCategoryIds = new Set(["flowers", "chocolates", "accessories", "gift-hampers"]);
    const isGift = giftCategoryIds.has(request.params.id) || (Array.isArray(value.giftCategories) && value.giftCategories.some((category) => category.id === request.params.id));
    const defaultGiftCategories = [
      { id: "flowers", label: "Flowers", detail: "Fresh blooms for every celebration", image: "", action: "flowers", active: true },
      { id: "chocolates", label: "Chocolates", detail: "Sweet gifts, ready to share", image: "", action: "chocolates", active: true },
      { id: "accessories", label: "Cake Accessories", detail: "Birthday essentials and finishing touches", image: "", action: "accessories", active: true },
      { id: "gift-hampers", label: "Gift Hampers", detail: "Curated celebration hampers, ready to gift", image: "", action: "gift-hampers", active: true },
    ];
    const categories = isGift
      ? (Array.isArray(value.giftCategories) && value.giftCategories.length ? value.giftCategories : defaultGiftCategories)
      : (Array.isArray(value.categories) ? value.categories : []);
    const index = categories.findIndex((category) => category.id === request.params.id);
    if (index < 0) { const error = new Error("Category card was not found."); error.status = 404; throw error; }
    const uploaded = await uploadImage(request.file, { folder: "cakes/categories", publicId: `category-${request.params.id}-${Date.now()}` });
    const previous = categories[index];
    categories[index] = { ...previous, image: uploaded.secure_url, imagePublicId: uploaded.public_id };
    await SiteSetting.findOneAndUpdate({ key: "homepage" }, { value: { ...value, [isGift ? "giftCategories" : "categories"]: categories } }, { upsert: true });
    if (previous.imagePublicId) await destroyImage(previous.imagePublicId);
    response.status(201).json({ data: { id: previous.id, url: uploaded.secure_url, publicId: uploaded.public_id } });
  } catch (error) { next(error); }
});
const slugify = (value) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
function readOccasionIds(value) {
  return normalizeStringList(value, occasions, "product occasions", occasions.size);
}
function readListInput(value, label) {
  if (typeof value !== "string") return value;
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) throw new Error();
    return parsed;
  } catch {
    const error = new Error(`Enter valid ${label}.`);
    error.status = 400;
    throw error;
  }
}
function readProductTaxonomy(body, existing = {}) {
  const legacyCategoryKey = String(body.category ?? existing.legacyCategoryKey ?? "").trim();
  const taxonomy = normalizeTaxonomy({
    mainCategory: body.mainCategory || existing.mainCategory,
    cakeSubcategory: body.cakeSubcategory || existing.cakeSubcategory,
    legacyCategoryKey,
  });
  if (!taxonomy) {
    const error = new Error("Choose a valid product category and cake subcategory.");
    error.status = 400;
    throw error;
  }
  const categoryKey = legacyKeyForProduct(taxonomy.mainCategory, taxonomy.cakeSubcategory);
  return { ...taxonomy, legacyCategoryKey: categoryKey };
}
async function getTaxonomyCategory(legacyKey) {
  const names = {
    classic: "Classic Cakes",
    chocolate: "Chocolate Cakes",
    fruit: "Fruit Cakes",
    special: "Premium & Special Cakes",
    photo: "Photo Cakes",
    desserts: "Desserts",
    custom: "Custom Cake",
    flowers: "Flowers",
    chocolates: "Chocolates",
    accessories: "Cake Accessories",
    "gift-hampers": "Gift Hampers",
  };
  return Category.findOneAndUpdate(
    { legacyKey },
    { $set: { active: true }, $setOnInsert: { name: names[legacyKey], slug: legacyKey } },
    { upsert: true, new: true, runValidators: true },
  );
}

router.post("/products", productImageUpload.array("images", 6), async (request, response, next) => {
  try {
    const name = String(request.body.name || "").trim();
    const taxonomy = readProductTaxonomy(request.body);
    const status = request.body.status === "Draft" ? "Draft" : "Active";
    if (request.body.featured !== undefined && !["true", "false", true, false].includes(request.body.featured)) { const error = new Error("Choose a valid best-seller setting."); error.status = 400; throw error; }
    const featured = request.body.featured === "true" || request.body.featured === true;
    const p500 = request.body.price500 === "" || request.body.price500 == null ? null : Number(request.body.price500);
    const p1kg = request.body.price1kg === "" || request.body.price1kg == null ? null : Number(request.body.price1kg);
    const occasionIds = readOccasionIds(readListInput(request.body.occasionIds, "product occasions"));
    const themes = readThemes(readListInput(request.body.themes, "product themes"));
    let suppliedVariants = [];
    if (request.body.variants) {
      try { suppliedVariants = JSON.parse(request.body.variants); } catch { const error = new Error("Enter valid product variants."); error.status = 400; throw error; }
    }
    if (!Array.isArray(suppliedVariants) || suppliedVariants.some((variant) => !variant || typeof variant.label !== "string" || !variant.label.trim() || variant.label.length > 40 || !Number.isFinite(Number(variant.price)) || Number(variant.price) < 0 || (variant.stockQuantity != null && (!Number.isInteger(Number(variant.stockQuantity)) || Number(variant.stockQuantity) < 0)))) { const error = new Error("Enter valid product variants."); error.status = 400; throw error; }
    if (taxonomy.mainCategory === "cakes" && suppliedVariants.length > 2) { const error = new Error("A cake can have at most two sizes."); error.status = 400; throw error; }
    if (!name || (!suppliedVariants.length && !Number.isFinite(p500) && !Number.isFinite(p1kg)) || (p500 != null && p500 < 0) || (p1kg != null && p1kg < 0)) {
      const error = new Error("Enter a product name and at least one valid price."); error.status = 400; throw error;
    }
    const category = await getTaxonomyCategory(taxonomy.legacyCategoryKey);
    const slug = `${category.slug}-${slugify(name)}`;
    if (await Product.exists({ slug })) { const error = new Error("A product with this name already exists in this category."); error.status = 409; throw error; }
    const uploaded = await Promise.all((request.files || []).map((file, index) => uploadImage(file, { folder: "cakes/products", publicId: `${slug}-${index}` })));
    const product = await Product.create({ name, slug, category: category._id, legacyCategoryKey: taxonomy.legacyCategoryKey, ...taxonomy, images: uploaded.map((image) => ({ url: image.secure_url, secure_url: image.secure_url, public_id: image.public_id, alt: `${name} image` })), occasionIds, themes, flavour: name, active: status === "Active", featured });
    const variants = suppliedVariants.length ? suppliedVariants.map((variant) => ({ product: product._id, label: variant.label.trim(), weightGrams: Number.isFinite(Number(variant.weightGrams)) ? Number(variant.weightGrams) : null, price: Number(variant.price), stockQuantity: variant.stockQuantity === "" || variant.stockQuantity == null ? null : Number(variant.stockQuantity), active: product.active })) : [
      ...(Number.isFinite(p500) ? [{ product: product._id, label: "500 g", weightGrams: 500, price: p500, active: product.active }] : []),
      ...(Number.isFinite(p1kg) ? [{ product: product._id, label: "1 kg", weightGrams: 1000, price: p1kg, active: product.active }] : []),
    ];
    const savedVariants = await ProductVariant.insertMany(variants);
    product.variants = savedVariants.map((variant) => variant._id);
    await product.save();
    response.status(201).json({ data: { id: product._id, name: product.name, category: taxonomy.legacyCategoryKey, p500, p1kg, status, image: uploaded[0]?.secure_url || "" } });
  } catch (error) { next(error); }
});
router.post("/products/:id/images", productImageUpload.single("image"), async (request, response, next) => {
  try {
    if (!request.file) {
      const error = new Error("A product image file is required.");
      error.status = 400;
      error.code = "image_required";
      throw error;
    }
    const product = await Product.findById(request.params.id);
    if (!product) {
      const error = new Error("Product was not found.");
      error.status = 404;
      error.code = "product_not_found";
      throw error;
    }
    const uploaded = await uploadImage(request.file, { folder: "cakes/products", publicId: `${product.slug}-${product.images.length}` });
    const image = { url: uploaded.secure_url, secure_url: uploaded.secure_url, public_id: uploaded.public_id, alt: request.body.alt || `${product.name} image` };
    product.images.push(image);
    await product.save();
    response.status(201).json({ data: image });
  } catch (error) { next(error); }
});

router.put("/products/:id/images/:index", productImageUpload.single("image"), async (request, response, next) => {
  try {
    const index = Number(request.params.index);
    if (!Number.isInteger(index) || index < 0 || !request.file) { const error = new Error("Choose a valid replacement image."); error.status = 400; throw error; }
    const product = await Product.findById(request.params.id);
    if (!product || !product.images[index]) { const error = new Error("Product image was not found."); error.status = 404; throw error; }
    const previous = product.images[index];
    const uploaded = await uploadImage(request.file, { folder: "cakes/products", publicId: `${product.slug}-${index}-${Date.now()}` });
    const image = { url: uploaded.secure_url, secure_url: uploaded.secure_url, public_id: uploaded.public_id, alt: request.body.alt || previous.alt || `${product.name} image` };
    product.images[index] = image;
    await product.save();
    if (previous.public_id && !await Product.exists({ "images.public_id": previous.public_id })) await destroyImage(previous.public_id);
    response.json({ data: image });
  } catch (error) { next(error); }
});

router.put("/products/:id", async (request, response, next) => {
  try {
    const product = await Product.findById(request.params.id);
    if (!product) { const error = new Error("Product was not found."); error.status = 404; throw error; }
    const name = String(request.body.name ?? product.name).trim();
    const description = String(request.body.description ?? product.description).trim();
    const flavour = String(request.body.flavour ?? product.flavour).trim();
    if (!name || name.length > 140 || description.length > 2000 || flavour.length > 100) { const error = new Error("Enter valid product details."); error.status = 400; throw error; }
    const taxonomy = readProductTaxonomy(request.body, product);
    if (request.body.featured !== undefined && typeof request.body.featured !== "boolean") { const error = new Error("Choose a valid best-seller setting."); error.status = 400; throw error; }
    const occasionIds = request.body.occasionIds === undefined ? product.occasionIds : readOccasionIds(readListInput(request.body.occasionIds, "product occasions"));
    const themes = request.body.themes === undefined ? product.themes : readThemes(readListInput(request.body.themes, "product themes"));
    const category = await getTaxonomyCategory(taxonomy.legacyCategoryKey);
    const variants = Array.isArray(request.body.variants) ? request.body.variants : null;
    if (!variants?.length || variants.some((variant) => !variant || !String(variant.label || "").trim() || String(variant.label).length > 40 || !Number.isFinite(Number(variant.price)) || Number(variant.price) < 0 || (variant.weightGrams != null && variant.weightGrams !== "" && (!Number.isFinite(Number(variant.weightGrams)) || Number(variant.weightGrams) < 0)) || (variant.stockQuantity != null && variant.stockQuantity !== "" && (!Number.isInteger(Number(variant.stockQuantity)) || Number(variant.stockQuantity) < 0))) || new Set(variants.map((variant) => String(variant.label).trim())).size !== variants.length || new Set(variants.filter((variant) => variant._id).map((variant) => String(variant._id))).size !== variants.filter((variant) => variant._id).length) {
      const error = new Error("Add at least one valid price option."); error.status = 400; throw error;
    }
    if (taxonomy.mainCategory === "cakes" && variants.length > 2) { const error = new Error("A cake can have at most two sizes."); error.status = 400; throw error; }
    const existingVariants = await ProductVariant.find({ product: product._id });
    const existingVariantIds = new Set(existingVariants.map((variant) => String(variant._id)));
    const submittedIds = variants.filter((variant) => variant._id).map((variant) => String(variant._id));
    if (submittedIds.some((variantId) => !existingVariantIds.has(variantId))) {
      const error = new Error("A price option does not belong to this product."); error.status = 400; throw error;
    }
    product.name = name; product.description = description; product.flavour = flavour;
    product.category = category._id; product.legacyCategoryKey = taxonomy.legacyCategoryKey;
    product.mainCategory = taxonomy.mainCategory; product.cakeSubcategory = taxonomy.cakeSubcategory;
    product.occasionIds = occasionIds;
    product.themes = themes;
    if (typeof request.body.featured === "boolean") product.featured = request.body.featured;
    if (typeof request.body.active === "boolean") {
      product.active = request.body.active;
      if (product.active) product.archivedAt = null;
    }
    await product.validate();
    const savedIds = [];
    for (const variant of variants) {
      const existingVariant = variant._id
        ? null
        : existingVariants.find((candidate) => candidate.label === String(variant.label).trim() && !savedIds.some((savedId) => String(savedId) === String(candidate._id)));
      const values = {
        label: String(variant.label).trim(),
        weightGrams: variant.weightGrams === "" || variant.weightGrams == null ? null : Number(variant.weightGrams),
        price: Number(variant.price),
        stockQuantity: variant.stockQuantity === "" || variant.stockQuantity == null ? null : Number(variant.stockQuantity),
        active: product.active,
      };
      if (variant._id || existingVariant) {
        const variantId = variant._id || existingVariant._id;
        const updateResult = await ProductVariant.updateOne({ _id: variantId, product: product._id }, { $set: values }, { runValidators: true });
        if (!updateResult.matchedCount) { const error = new Error("A price option is no longer available."); error.status = 409; throw error; }
        savedIds.push(variantId);
      } else {
        const [created] = await ProductVariant.create([{ product: product._id, ...values }]);
        savedIds.push(created._id);
      }
    }
    await ProductVariant.updateMany({ product: product._id, _id: { $nin: savedIds } }, { $set: { active: false } });
    product.variants = [...new Set([...product.variants.map(String), ...savedIds.map(String)])];
    await product.save();
    response.json({ data: await Product.findById(product._id).populate("category", "name legacyKey").populate("variants", "label price weightGrams stockQuantity active").lean() });
  } catch (error) { next(error); }
});

router.delete("/products/:id/images/:index", async (request, response, next) => {
  try {
    const index = Number(request.params.index);
    if (!Number.isInteger(index) || index < 0) { const error = new Error("Invalid image."); error.status = 400; throw error; }
    const product = await Product.findById(request.params.id);
    if (!product) { const error = new Error("Product was not found."); error.status = 404; throw error; }
    if (!product.images[index]) { const error = new Error("Image was not found."); error.status = 404; throw error; }
    const removed = product.images[index];
    product.images.splice(index, 1); await product.save();
    // Only delete a Cloudinary asset after MongoDB no longer references it.
    if (removed.public_id && !await Product.exists({ "images.public_id": removed.public_id })) await destroyImage(removed.public_id);
    response.json({ data: { id: String(product._id), removed: true } });
  } catch (error) { next(error); }
});

router.delete("/products/:id", async (request, response, next) => {
  try {
    const product = await Product.findById(request.params.id).select("_id name images");
    if (!product) {
      const error = new Error("Product was not found.");
      error.status = 404;
      error.code = "product_not_found";
      throw error;
    }
    const orders = await Order.find({ "items.product": product._id }).select("items.variant").lean();
    const orderedVariantIds = [...new Set(orders.flatMap((order) => order.items.map((item) => item.variant).filter(Boolean).map(String)))];
    await Product.deleteOne({ _id: product._id });
    await ProductVariant.deleteMany({
      product: product._id,
      ...(orderedVariantIds.length ? { _id: { $nin: orderedVariantIds } } : {}),
    });

    let imageCleanupPending = 0;
    for (const image of product.images || []) {
      if (!image.public_id || await Product.exists({ "images.public_id": image.public_id })) continue;
      try {
        await destroyImage(image.public_id);
      } catch (error) {
        imageCleanupPending += 1;
        console.error(`Cloudinary cleanup failed for deleted product ${product._id}:`, error);
      }
    }
    response.json({ data: { id: String(product._id), name: product.name, deleted: true, imageCleanupPending } });
  } catch (error) { next(error); }
});
module.exports = router;
