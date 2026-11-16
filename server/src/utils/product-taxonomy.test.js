const test = require("node:test");
const assert = require("node:assert/strict");
const {
  cakeSubcategories,
  occasions,
  normalizeTaxonomy,
  normalizeStringList,
  readThemes,
} = require("./product-taxonomy");

test("legacy cake categories resolve into the new taxonomy", () => {
  assert.deepEqual(normalizeTaxonomy({ legacyCategoryKey: "chocolate" }), {
    mainCategory: "cakes",
    cakeSubcategory: "chocolate",
  });
  assert.deepEqual(normalizeTaxonomy({ legacyCategoryKey: "flowers" }), {
    mainCategory: "flowers",
    cakeSubcategory: null,
  });
  assert.deepEqual(normalizeTaxonomy({ mainCategory: "cakes", cakeSubcategory: "custom" }), {
    mainCategory: "cakes",
    cakeSubcategory: "custom",
  });
});

test("taxonomy rejects unsupported categories and cake subcategories", () => {
  assert.equal(normalizeTaxonomy({ mainCategory: "cakes", cakeSubcategory: "birthday" }), null);
  assert.equal(normalizeTaxonomy({ mainCategory: "custom-cake" }), null);
});

test("occasion and theme arrays are normalized and validated", () => {
  assert.deepEqual(normalizeStringList(["birthday", "festival"], occasions, "occasions"), ["birthday", "festival"]);
  assert.throws(() => normalizeStringList(["wedding"], occasions, "occasions"), /Choose valid/);
  assert.deepEqual(readThemes(["Sonic", "Barbie"]), ["Sonic", "Barbie"]);
  assert.throws(() => readThemes(["Sonic", "sonic"]), /unique/);
});

test("the cake subcategory set contains exactly the supported values", () => {
  assert.deepEqual([...cakeSubcategories], ["classic", "chocolate", "fruit", "special", "photo", "desserts", "custom"]);
});
