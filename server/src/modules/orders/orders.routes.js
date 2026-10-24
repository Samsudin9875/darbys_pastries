const router = require("express").Router();
const { getAuth } = require("@clerk/express");
const Product = require("../../models/product.model");
const ProductVariant = require("../../models/product-variant.model");
const Order = require("../../models/order.model");
const requireAuth = require("../../middleware/require-auth");
const requireAdmin = require("../../middleware/require-admin");
const { calculateCatalogueOrder, calculateCustomCakeOrder } = require("./orders.service");

const fail = (message, status = 400) => Object.assign(new Error(message), { status, code: "validation_error" });
const id = () => `DBY-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

router.post("/", async (request, response, next) => {
  try {
    const pricing = await calculateCatalogueOrder(request.body?.items, async (productId, variantId) => {
      const [product, variant] = await Promise.all([Product.findOne({ _id: productId, active: true }), ProductVariant.findOne({ _id: variantId, product: productId, active: true })]);
      return { product, variant };
    });
    const name = String(request.body?.customer?.name || "").trim();
    const phone = String(request.body?.customer?.phone || "").replace(/\D/g, "");
    if (!name || !/^\d{10}$/.test(phone)) throw fail("A customer name and valid 10-digit phone number are required.");
    const order = await Order.create({ orderId: id(), clerkUserId: getAuth(request).userId || "", type: "catalogue", items: pricing.lines, customer: { name, phone }, subtotal: pricing.subtotal, total: pricing.total, advanceDue: pricing.advanceDue });
    response.status(201).json({ data: order });
  } catch (error) { next(error); }
});
router.post("/custom", async (request, response, next) => {
  try {
    const pricing = calculateCustomCakeOrder(request.body?.customCake, request.body?.customer);
    const order = await Order.create({ orderId: id(), clerkUserId: getAuth(request).userId || "", type: "custom", ...pricing });
    response.status(201).json({ data: order });
  } catch (error) { next(error); }
});
router.get("/mine", requireAuth, async (request, response, next) => { try { response.json({ data: await Order.find({ clerkUserId: request.authenticatedUser.clerkUserId }).sort({ createdAt: -1 }).lean() }); } catch (error) { next(error); } });
router.use("/admin", requireAuth, requireAdmin);
router.get("/admin", async (_request, response, next) => { try { response.json({ data: await Order.find().sort({ createdAt: -1 }).limit(100).lean() }); } catch (error) { next(error); } });
router.patch("/admin/:id", async (request, response, next) => {
  try {
    const patch = {};
    if (["pending", "confirmed", "rejected", "cancelled", "completed"].includes(request.body.status)) patch.status = request.body.status;
    if (["pending", "preparing", "out_for_delivery", "delivered", "pickup_ready"].includes(request.body.deliveryStatus)) patch.deliveryStatus = request.body.deliveryStatus;
    for (const key of ["advancePaid", "remainingPaid", "refunded"]) if (request.body[key] !== undefined) { const value = Number(request.body[key]); if (!Number.isFinite(value) || value < 0) throw fail("Payment values must be valid amounts."); patch[key] = value; }
    const order = await Order.findByIdAndUpdate(request.params.id, { $set: patch }, { new: true, runValidators: true });
    if (!order) throw fail("Order not found.", 404);
    response.json({ data: order });
  } catch (error) { next(error); }
});
module.exports = router;
