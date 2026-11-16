const mainCategories = new Set(["cakes", "flowers", "chocolates", "accessories", "gift-hampers"]);
const cakeSubcategories = new Set(["classic", "chocolate", "fruit", "special", "photo", "desserts", "custom"]);
const occasions = new Set(["birthday", "anniversary", "baby-shower", "festival", "other-special-occasions"]);
const themePresets = new Set(["avengers", "sonic", "doraemon", "tom-jerry", "barbie", "jungle-safari", "other-themes"]);
const nonCakeLegacyKeys = new Set(["flowers", "chocolates", "accessories", "gift-hampers"]);
const legacyCakeSubcategories = {
  classic: "classic",
  chocolate: "chocolate",
  fruit: "fruit",
  special: "special",
  custom: "photo",
  photo: "photo",
  desserts: "desserts",
};

function mainCategoryFromLegacyKey(legacyKey) {
  return nonCakeLegacyKeys.has(legacyKey) ? legacyKey : "cakes";
}

function cakeSubcategoryFromLegacyKey(legacyKey) {
  return legacyCakeSubcategories[legacyKey] || null;
}

function legacyKeyForProduct(mainCategory, cakeSubcategory) {
  return mainCategory === "cakes" ? cakeSubcategory : mainCategory;
}

function normalizeTaxonomy({ mainCategory, cakeSubcategory, legacyCategoryKey }) {
  const resolvedMainCategory = mainCategory || mainCategoryFromLegacyKey(legacyCategoryKey);
  if (!mainCategories.has(resolvedMainCategory)) return null;

  if (resolvedMainCategory !== "cakes") {
    return { mainCategory: resolvedMainCategory, cakeSubcategory: null };
  }

  const resolvedSubcategory = cakeSubcategory || cakeSubcategoryFromLegacyKey(legacyCategoryKey);
  if (!cakeSubcategories.has(resolvedSubcategory)) return null;
  return { mainCategory: "cakes", cakeSubcategory: resolvedSubcategory };
}

function normalizeStringList(value, allowedValues, label, maxItems = 12) {
  const values = value == null ? [] : Array.isArray(value) ? value : [value];
  if (values.length > maxItems || values.some((entry) => typeof entry !== "string" || !entry.trim() || entry.trim().length > 50)) {
    const error = new Error(`Choose valid ${label}.`);
    error.status = 400;
    throw error;
  }
  const normalized = values.map((entry) => entry.trim().toLowerCase());
  if (new Set(normalized).size !== normalized.length || normalized.some((entry) => allowedValues && !allowedValues.has(entry))) {
    const error = new Error(`Choose valid, unique ${label}.`);
    error.status = 400;
    throw error;
  }
  return normalized;
}

function readThemes(value) {
  const themes = value == null ? [] : Array.isArray(value) ? value : [value];
  if (themes.length > 12 || themes.some((theme) => typeof theme !== "string" || !theme.trim() || theme.trim().length > 50)) {
    const error = new Error("Choose valid product themes.");
    error.status = 400;
    throw error;
  }
  const normalized = themes.map((theme) => theme.trim());
  const keys = normalized.map((theme) => theme.toLowerCase());
  if (new Set(keys).size !== keys.length) {
    const error = new Error("Choose unique product themes.");
    error.status = 400;
    throw error;
  }
  return normalized;
}

module.exports = {
  mainCategories,
  cakeSubcategories,
  occasions,
  themePresets,
  mainCategoryFromLegacyKey,
  cakeSubcategoryFromLegacyKey,
  legacyKeyForProduct,
  normalizeTaxonomy,
  normalizeStringList,
  readThemes,
};
