const test = require("node:test");
const assert = require("node:assert/strict");
const { calculateCatalogueOrder, calculateCustomCakeOrder } = require("./orders.service");

const cake = { occasion: "Birthday", flavour: "Chocolate Truffle", weight: 1.5, shape: "Heart", eggPreference: "Eggless", cakeMessage: "Happy Birthday", deliveryType: "Home Delivery", deliveryDate: "2099-01-02", deliveryTime: "Evening (4 PM - 8 PM)", pincode: "560036" };
const customer = { name: "Aarav", phone: "98358 88631", address: "3 KR Puram Road" };

test("custom pricing is calculated on the server and ignores a browser total", () => {
  const result = calculateCustomCakeOrder({ ...cake, total: 1 }, customer);
  assert.equal(result.total, 1425);
  assert.equal(result.subtotal, 1425);
  assert.equal(result.advanceDue, 713);
  assert.equal(result.customer.phone, "9835888631");
});
test("custom cake rejects invalid delivery and customization fields", () => {
  assert.throws(() => calculateCustomCakeOrder({ ...cake, flavour: "Free Cake" }, customer), /valid flavour/);
  assert.throws(() => calculateCustomCakeOrder({ ...cake, deliveryTime: "Anytime" }, customer), /time slot/);
  assert.throws(() => calculateCustomCakeOrder(cake, { ...customer, address: "" }), /address/);
});
test("catalogue pricing uses trusted product variants", async () => {
  const result = await calculateCatalogueOrder([{ productId: "product", variantId: "variant", quantity: 2, unitPrice: 1 }], async () => ({ product: { _id: "product", name: "Cake" }, variant: { _id: "variant", label: "1 kg", price: 900 } }));
  assert.equal(result.total, 1800);
  assert.equal(result.lines[0].unitPrice, 900);
});
