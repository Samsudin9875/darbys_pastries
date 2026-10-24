function validateOrder(request, _response, next) {
  const { items, customer } = request.body || {};
  if (!Array.isArray(items) || items.length === 0 || items.length > 50) return invalid(next, "Order must contain 1–50 items.");
  if (!customer || typeof customer.name !== "string" || !customer.name.trim() || typeof customer.phone !== "string" || !/^\d{10}$/.test(customer.phone.replace(/\D/g, ""))) {
    return invalid(next, "A customer name and valid 10-digit phone number are required.");
  }
  if (items.some((item) => !item || typeof item.productId !== "string" || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 20)) {
    return invalid(next, "Every item needs a productId and quantity between 1 and 20.");
  }
  return next();
}

function invalid(next, message) {
  const error = new Error(message);
  error.status = 400;
  error.code = "validation_error";
  return next(error);
}

module.exports = { validateOrder };
