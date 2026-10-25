const router = require("express").Router();
const { getAuth } = require("@clerk/express");
const Product = require("../../models/product.model");
const ProductVariant = require("../../models/product-variant.model");
const Order = require("../../models/order.model");
const requireAuth = require("../../middleware/require-auth");
const requireAdmin = require("../../middleware/require-admin");
const { calculateCatalogueOrder, calculateCustomCakeOrder, reserveCatalogueStock, paymentUpdate, orderSummary } = require("./orders.service");

const fail = (message, status = 400) => Object.assign(new Error(message), { status, code: "validation_error" });
const id = () => `DBY-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

router.post("/", async (request, response, next) => {
  let session;
  try {
    const name = String(request.body?.customer?.name || "").trim();
    const phone = String(request.body?.customer?.phone || "").replace(/\D/g, "");
    const deliveryType = String(request.body?.customer?.deliveryType || "Store Pickup").trim();
    const address = String(request.body?.customer?.address || "").trim();
    const pincode = String(request.body?.customer?.pincode || "").trim();
    if (!name || !/^\d{10}$/.test(phone)) throw fail("A customer name and valid 10-digit phone number are required.");
    if (!["Home Delivery", "Store Pickup"].includes(deliveryType)) throw fail("Choose home delivery or store pickup.");
    if (address.length > 500) throw fail("Delivery address is too long.");
    if (pincode && !/^\d{6}$/.test(pincode)) throw fail("Enter a valid 6-digit pincode.");
    if (deliveryType === "Home Delivery" && (!address || !pincode)) throw fail("Delivery address and 6-digit pincode are required for home delivery.");
    session = await ProductVariant.startSession();
    let order;
    await session.withTransaction(async () => {
      const pricing = await calculateCatalogueOrder(request.body?.items, async (productId, variantId) => {
        const [product, variant] = await Promise.all([Product.findOne({ _id: productId, active: true }).session(session), ProductVariant.findOne({ _id: variantId, product: productId, active: true }).session(session)]);
        return { product, variant };
      });
      await reserveCatalogueStock(pricing.lines, async (line) => {
        const finiteStock = await ProductVariant.findOneAndUpdate({ _id: line.variant, product: line.product, active: true, stockQuantity: { $gte: line.quantity } }, { $inc: { stockQuantity: -line.quantity } }, { new: true, session });
        return finiteStock || ProductVariant.exists({ _id: line.variant, product: line.product, active: true, stockQuantity: null }).session(session);
      });
      [order] = await Order.create([{ orderId: id(), clerkUserId: getAuth(request).userId || "", type: "catalogue", items: pricing.lines, customer: { name, phone, address: deliveryType === "Home Delivery" ? address : "", pincode: deliveryType === "Home Delivery" ? pincode : "", deliveryType }, subtotal: pricing.subtotal, total: pricing.total, advanceDue: pricing.advanceDue, stockReserved: true }], { session });
    });
    response.status(201).json({ data: order });
  } catch (error) { next(error); } finally { if (session) await session.endSession(); }
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
router.get("/admin", async (_request, response, next) => { try { response.json({ data: (await Order.find().sort({ createdAt: -1 }).limit(100).lean()).map(orderSummary) }); } catch (error) { next(error); } });
router.patch("/admin/:id", async (request, response, next) => {
  let session;
  try {
    session = await ProductVariant.startSession();
    let order;
    await session.withTransaction(async () => {
      order = await Order.findById(request.params.id).session(session);
      if (!order) throw fail("Order not found.", 404);
      const patch = paymentUpdate(order, request.body || {});
      if (request.body.status !== undefined) {
        if (!["pending", "confirmed", "rejected", "cancelled", "completed"].includes(request.body.status)) throw fail("Choose a valid order status.");
        patch.status = request.body.status;
      }
      if (request.body.deliveryStatus !== undefined) {
        if (!["pending", "preparing", "out_for_delivery", "delivered", "pickup_ready"].includes(request.body.deliveryStatus)) throw fail("Choose a valid delivery status.");
        patch.deliveryStatus = request.body.deliveryStatus;
      }
      if (["rejected", "cancelled"].includes(patch.status) && order.stockReserved) {
        for (const item of order.items) await ProductVariant.updateOne({ _id: item.variant, stockQuantity: { $ne: null } }, { $inc: { stockQuantity: item.quantity } }, { session });
        patch.stockReserved = false;
      }
      Object.assign(order, patch);
      await order.save({ session });
    });
    response.json({ data: order });
  } catch (error) { next(error); } finally { if (session) await session.endSession(); }
});
module.exports = router;
