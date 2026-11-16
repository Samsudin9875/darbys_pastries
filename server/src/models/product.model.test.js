const test = require("node:test");
const assert = require("node:assert/strict");
const Product = require("./product.model");

function productWithOccasions(occasionIds) {
  return new Product({
    name: "Test Cake",
    slug: "test-cake",
    category: "000000000000000000000001",
    legacyCategoryKey: "classic",
    occasionIds,
  });
}

test("product accepts valid occasion assignments", async () => {
  await assert.doesNotReject(productWithOccasions(["birthday", "anniversary"]).validate());
});

test("product rejects invalid occasion assignments", async () => {
  await assert.rejects(productWithOccasions(["invalid occasion"]).validate(), (error) => Boolean(error.errors.occasionIds || error.errors["occasionIds.0"]));
});

test("product rejects too many occasion assignments", async () => {
  await assert.rejects(productWithOccasions(Array.from({ length: 13 }, (_value, index) => `occasion-${index}`)).validate(), (error) => Boolean(error.errors.occasionIds));
});
