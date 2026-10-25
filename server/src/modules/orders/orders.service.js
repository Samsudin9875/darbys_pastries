const flavourRates = Object.freeze({ "Classic Vanilla": 700, "Black Forest": 700, Butterscotch: 800, "Chocolate Truffle": 850, "Red Velvet": 1000, Rasmalai: 1100 });
const shapeSurcharge = Object.freeze({ Round: 0, Square: 50, Heart: 100, Tier: 700 });
const occasions = new Set(["Birthday", "Anniversary", "Wedding", "Baby Shower", "Corporate", "Other"]);
const weights = new Set([0.5, 1, 1.5, 2]);
const deliveryTypes = new Set(["Home Delivery", "Store Pickup"]);
const deliveryTimes = new Set(["Morning (9 AM - 12 PM)", "Afternoon (12 PM - 4 PM)", "Evening (4 PM - 8 PM)"]);

function invalid(message) { return Object.assign(new Error(message), { status: 400, code: "validation_error" }); }
function text(value, maxLength, label, required = true) {
  if (typeof value !== "string") throw invalid(`${label} must be text.`);
  const result = value.trim();
  if (required && !result) throw invalid(`${label} is required.`);
  if (result.length > maxLength) throw invalid(`${label} is too long.`);
  return result;
}
function validDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw invalid("Choose a valid delivery date.");
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.valueOf()) || date.toISOString().slice(0, 10) !== value) throw invalid("Choose a valid delivery date.");
  if (value < new Date().toISOString().slice(0, 10)) throw invalid("Delivery date cannot be in the past.");
  return value;
}
function validateCustomCake(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw invalid("Enter valid custom cake details.");
  const occasion = text(raw.occasion, 40, "Occasion"); if (!occasions.has(occasion)) throw invalid("Choose a valid occasion.");
  const flavour = text(raw.flavour, 40, "Flavour"); if (!Object.hasOwn(flavourRates, flavour)) throw invalid("Choose a valid flavour.");
  const weight = Number(raw.weight); if (!weights.has(weight)) throw invalid("Choose a valid cake weight.");
  const shape = text(raw.shape, 20, "Shape"); if (!Object.hasOwn(shapeSurcharge, shape)) throw invalid("Choose a valid cake shape.");
  const eggPreference = text(raw.eggPreference, 10, "Egg preference"); if (!["Egg", "Eggless"].includes(eggPreference)) throw invalid("Choose Egg or Eggless.");
  const deliveryType = text(raw.deliveryType, 20, "Delivery type"); if (!deliveryTypes.has(deliveryType)) throw invalid("Choose a valid delivery type.");
  const deliveryDate = validDate(raw.deliveryDate);
  const deliveryTime = text(raw.deliveryTime, 30, "Delivery time slot"); if (!deliveryTimes.has(deliveryTime)) throw invalid("Choose a valid delivery time slot.");
  const pincode = text(raw.pincode, 6, "Pincode"); if (!/^\d{6}$/.test(pincode)) throw invalid("Enter a valid 6-digit pincode.");
  const cakeMessage = raw.cakeMessage == null ? "" : text(raw.cakeMessage, 60, "Cake message", false);
  return { occasion, flavour, weight, shape, eggPreference, cakeMessage, deliveryType, deliveryDate, deliveryTime, pincode };
}
function calculateCustomCakeOrder(rawCake, rawCustomer) {
  const customCake = validateCustomCake(rawCake);
  const name = text(rawCustomer?.name, 120, "Customer name");
  const phone = text(rawCustomer?.phone, 20, "Customer phone").replace(/\D/g, ""); if (!/^\d{10}$/.test(phone)) throw invalid("A valid 10-digit phone number is required.");
  const address = rawCustomer?.address == null ? "" : text(rawCustomer.address, 500, "Delivery address", false);
  if (customCake.deliveryType === "Home Delivery" && !address) throw invalid("Delivery address is required for home delivery.");
  const total = Math.round(flavourRates[customCake.flavour] * customCake.weight + shapeSurcharge[customCake.shape] + (customCake.eggPreference === "Eggless" ? 50 : 0));
  return { customCake, customer: { name, phone, address: customCake.deliveryType === "Home Delivery" ? address : "", deliveryType: customCake.deliveryType, deliveryDate: customCake.deliveryDate, deliveryTime: customCake.deliveryTime }, subtotal: total, total, advanceDue: Math.round(total / 2) };
}
async function calculateCatalogueOrder(items, findLine) {
  if (!Array.isArray(items) || !items.length || items.length > 20) throw invalid("Add 1 to 20 products to place an order.");
  const lines = [];
  for (const item of items) {
    if (!item?.productId || !item.variantId || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 20) throw invalid("Invalid order item.");
    const source = await findLine(item.productId, item.variantId); if (!source?.product || !source.variant) throw invalid("One or more products are no longer available.");
    const { product, variant } = source; lines.push({ product: product._id, variant: variant._id, name: product.name, weight: variant.label, quantity: item.quantity, unitPrice: variant.price, lineTotal: variant.price * item.quantity });
  }
  const total = lines.reduce((sum, line) => sum + line.lineTotal, 0);
  return { lines, subtotal: total, total, advanceDue: Math.round(total / 2) };
}
async function reserveCatalogueStock(lines, reserveLine) {
  for (const line of lines) {
    const reserved = await reserveLine(line);
    if (!reserved) throw Object.assign(invalid(`${line.name} no longer has enough stock.`), { status: 409, code: "out_of_stock" });
  }
}
function paymentUpdate(order, raw) {
  const next = {};
  for (const key of ["advancePaid", "remainingPaid", "refunded"]) {
    if (raw[key] === undefined) continue;
    const value = Number(raw[key]);
    if (!Number.isFinite(value) || value < 0) throw invalid("Payment values must be valid amounts.");
    next[key] = Math.round(value * 100) / 100;
  }
  const advancePaid = next.advancePaid ?? order.advancePaid;
  const remainingPaid = next.remainingPaid ?? order.remainingPaid;
  const refunded = next.refunded ?? order.refunded;
  if (advancePaid > order.advanceDue) throw invalid("Advance collected cannot exceed the advance due.");
  if (advancePaid + remainingPaid > order.total) throw invalid("Payments cannot exceed the order total.");
  if (refunded > advancePaid + remainingPaid) throw invalid("Refunds cannot exceed collected payments.");
  return next;
}
function orderSummary(order) {
  const collected = order.advancePaid + order.remainingPaid;
  return { ...order, collectedAmount: collected, balanceDue: Math.max(0, order.total - collected + order.refunded) };
}
module.exports = { calculateCatalogueOrder, calculateCustomCakeOrder, reserveCatalogueStock, paymentUpdate, orderSummary, flavourRates, shapeSurcharge };
