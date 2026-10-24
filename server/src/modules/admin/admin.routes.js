const router = require("express").Router();
const requireAuth = require("../../middleware/require-auth");
const requireAdmin = require("../../middleware/require-admin");
const Product = require("../../models/product.model");
const Category = require("../../models/category.model");
const ProductVariant = require("../../models/product-variant.model");
const SiteSetting = require("../../models/site-setting.model");
const Order = require("../../models/order.model");
const { productImageUpload, uploadImage, destroyImage } = require("../../integrations/cloudinary/upload");
const cakeCategoryKeys = ["classic", "chocolate", "fruit", "special", "custom", "desserts"];
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
  try { response.json({ data: await Product.find({ legacyCategoryKey: { $in: cakeCategoryKeys } }).sort({ legacyCategoryKey: 1, name: 1 }).populate("category", "name legacyKey").populate("variants", "label price weightGrams stockQuantity active").lean() }); } catch (error) { next(error); }
});
router.get("/site-settings", async (_request, response, next) => {
  try { const setting = await SiteSetting.findOne({ key: "homepage" }).lean(); response.json({ data: setting?.value || null }); } catch (error) { next(error); }
});
router.put("/site-settings", async (request, response, next) => {
  try {
    const hero = request.body?.hero;
    const categories = request.body?.categories;
    if (hero && ["eyebrow", "title", "description", "badge", "image"].some((field) => typeof hero[field] !== "string" || hero[field].trim().length > 500)) {
      const error = new Error("Enter valid hero content."); error.status = 400; throw error;
    }
    if (categories && (!Array.isArray(categories) || categories.length > 12 || categories.some((category) => !category?.id || typeof category.label !== "string" || typeof category.detail !== "string" || typeof category.image !== "string" || typeof category.action !== "string" || category.label.length > 80 || category.detail.length > 300))) {
      const error = new Error("Enter valid category cards."); error.status = 400; throw error;
    }
    if (!hero && !categories) { const error = new Error("Nothing to save."); error.status = 400; throw error; }
    const existing = await SiteSetting.findOne({ key: "homepage" }).lean();
    const value = { ...(existing?.value || {}) };
    if (hero) value.hero = Object.fromEntries(Object.entries(hero).map(([key, value]) => [key, value.trim()]));
    if (categories) value.categories = categories.map((category) => ({ ...category, label: category.label.trim(), detail: category.detail.trim() }));
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
    const categories = Array.isArray(value.categories) ? value.categories : [];
    const index = categories.findIndex((category) => category.id === request.params.id);
    if (index < 0) { const error = new Error("Category card was not found."); error.status = 404; throw error; }
    const uploaded = await uploadImage(request.file, { folder: "cakes/categories", publicId: `category-${request.params.id}-${Date.now()}` });
    const previous = categories[index];
    categories[index] = { ...previous, image: uploaded.secure_url, imagePublicId: uploaded.public_id };
    await SiteSetting.findOneAndUpdate({ key: "homepage" }, { value: { ...value, categories } }, { upsert: true });
    if (previous.imagePublicId) await destroyImage(previous.imagePublicId);
    response.status(201).json({ data: { id: previous.id, url: uploaded.secure_url, publicId: uploaded.public_id } });
  } catch (error) { next(error); }
});
const slugify = (value) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

router.post("/products", productImageUpload.array("images", 6), async (request, response, next) => {
  try {
    const name = String(request.body.name || "").trim();
    const legacyCategoryKey = String(request.body.category || "").trim();
    const status = request.body.status === "Draft" ? "Draft" : "Active";
    const p500 = request.body.price500 === "" || request.body.price500 == null ? null : Number(request.body.price500);
    const p1kg = request.body.price1kg === "" || request.body.price1kg == null ? null : Number(request.body.price1kg);
    if (!name || (!Number.isFinite(p500) && !Number.isFinite(p1kg)) || (p500 != null && p500 < 0) || (p1kg != null && p1kg < 0)) {
      const error = new Error("Enter a product name and at least one valid price."); error.status = 400; throw error;
    }
    const category = await Category.findOne({ legacyKey: legacyCategoryKey, active: true });
    if (!category) { const error = new Error("Choose a valid product category."); error.status = 400; throw error; }
    const slug = `${category.slug}-${slugify(name)}`;
    if (await Product.exists({ slug })) { const error = new Error("A product with this name already exists in this category."); error.status = 409; throw error; }
    const uploaded = await Promise.all((request.files || []).map((file, index) => uploadImage(file, { folder: "cakes/products", publicId: `${slug}-${index}` })));
    const product = await Product.create({ name, slug, category: category._id, legacyCategoryKey, images: uploaded.map((image) => ({ url: image.secure_url, secure_url: image.secure_url, public_id: image.public_id, alt: `${name} image` })), flavour: name, active: status === "Active" });
    const variants = [];
    if (Number.isFinite(p500)) variants.push({ product: product._id, label: "500 g", weightGrams: 500, price: p500, active: product.active });
    if (Number.isFinite(p1kg)) variants.push({ product: product._id, label: "1 kg", weightGrams: 1000, price: p1kg, active: product.active });
    const savedVariants = await ProductVariant.insertMany(variants);
    product.variants = savedVariants.map((variant) => variant._id);
    await product.save();
    response.status(201).json({ data: { id: product._id, name: product.name, category: legacyCategoryKey, p500, p1kg, status, image: uploaded[0]?.secure_url || "" } });
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
    product.name = name; product.description = description; product.flavour = flavour;
    if (typeof request.body.active === "boolean") product.active = request.body.active;
    await product.save();
    response.json({ data: product });
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
    await ProductVariant.deleteMany({ product: product._id });
    await Product.deleteOne({ _id: product._id });
    for (const image of product.images) if (image.public_id && !await Product.exists({ "images.public_id": image.public_id })) await destroyImage(image.public_id);
    response.json({ data: { id: String(product._id), name: product.name, removed: true } });
  } catch (error) { next(error); }
});
module.exports = router;
