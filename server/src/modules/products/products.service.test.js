const test = require("node:test");
const assert = require("node:assert/strict");
const { buildProductQuery, findProducts } = require("./products.service");

test("product filters combine category, occasion, theme and name search", () => {
  const query = buildProductQuery({
    mainCategory: "cakes",
    cakeSubcategory: "chocolate",
    occasion: "birthday",
    theme: "Sonic",
    search: "Black Forest",
  });

  assert.equal(query.active, true);
  assert.equal(query.themes, "Sonic");
  assert.equal(query.name.$regex, "Black Forest");
  assert.equal(query.name.$options, "i");
  assert.equal(query.$and.length, 4);
  assert.deepEqual(query.$and[3], { mainCategory: "cakes" });
});

test("theme-only filtering excludes non-cake products", () => {
  const query = buildProductQuery({ theme: "Jungle Safari" });
  assert.equal(query.themes, "Jungle Safari");
  assert.deepEqual(query.$and, [{ mainCategory: "cakes" }]);
});

test("occasion and theme collection includes only tagged cakes", () => {
  const query = buildProductQuery({ mainCategory: "cakes", hasOccasionOrTheme: "true" });
  assert.deepEqual(query.$and[1], {
    $or: [
      { mainCategory: "cakes", $or: [
        { occasionIds: { $exists: true, $ne: [] } },
        { themes: { $exists: true, $ne: [] } },
      ] },
      { mainCategory: null, legacyCategoryKey: { $in: ["birthday", "anniversary", "baby-shower", "festival", "other-special-occasions"] } },
    ],
  });
});

test("custom cake subcategory filters only products assigned to the new subcategory", () => {
  const query = buildProductQuery({ mainCategory: "cakes", cakeSubcategory: "custom" });
  assert.deepEqual(query.$and[0], {
    $or: [
      { mainCategory: "cakes" },
      { mainCategory: null, legacyCategoryKey: { $in: ["classic", "chocolate", "fruit", "special", "photo", "custom", "birthday", "desserts"] } },
    ],
  });
  assert.deepEqual(query.$and[1].$or[0], { cakeSubcategory: "custom" });
  assert.deepEqual(query.$and[1].$or[1].legacyCategoryKey.$in, []);
});

test("product name search escapes regex input", () => {
  const query = buildProductQuery({ search: "Cake (1)+" });
  assert.equal(query.name.$regex, "Cake \\(1\\)\\+");
});

test("multiple main categories and published theme availability are composable", () => {
  const query = buildProductQuery({ mainCategory: "flowers,chocolates", hasTheme: "true", search: "Gift" });
  assert.deepEqual(query.$and[0].$or[0], { mainCategory: { $in: ["flowers", "chocolates"] } });
  assert.deepEqual(query.$and[1], { mainCategory: "cakes" });
  assert.deepEqual(query.themes, { $exists: true, $ne: [] });
  assert.equal(query.name.$regex, "Gift");
});

test("invalid page, sort and price range values are rejected", async () => {
  await assert.rejects(() => findProducts({ page: "0" }), { status: 400 });
  await assert.rejects(() => findProducts({ sort: "random" }), { status: 400 });
  await assert.rejects(() => findProducts({ minPrice: "500", maxPrice: "100" }), { status: 400 });
});
