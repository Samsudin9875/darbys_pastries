import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import mongoose from "mongoose";
import dotenv from "dotenv";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(scriptDirectory, "../../.env") });

const cakeSubcategories = new Set(["classic", "chocolate", "fruit", "special", "photo", "desserts"]);
const occasions = new Set(["birthday", "anniversary", "baby-shower", "festival", "other-special-occasions"]);
const cakeCategoryByLegacyKey = {
  classic: "classic",
  chocolate: "chocolate",
  fruit: "fruit",
  special: "special",
  photo: "photo",
  custom: "photo",
  desserts: "desserts",
};
const nonCakeCategories = new Set(["flowers", "chocolates", "accessories", "gift-hampers"]);
const knownCakeCategories = new Set([...Object.keys(cakeCategoryByLegacyKey), "birthday"]);
const args = new Set(process.argv.slice(2));
const confirmedDatabase = process.argv.slice(2).find((arg) => arg.startsWith("--confirm-db="))?.slice("--confirm-db=".length);
const apply = args.has("--apply");
const allowUnclassified = args.has("--allow-unclassified");
const allowProduction = args.has("--confirm-production");

function classify(product, categoryKey) {
  const legacyKey = categoryKey === "cake-accessories" ? "accessories" : categoryKey;
  const cakeSubcategory = cakeCategoryByLegacyKey[legacyKey] || null;
  const knownCakeCategory = knownCakeCategories.has(legacyKey);
  let mainCategory = nonCakeCategories.has(legacyKey) || knownCakeCategory ? (nonCakeCategories.has(legacyKey) ? legacyKey : "cakes") : null;
  let mappedSubcategory = cakeSubcategory;
  const name = String(product.name || "").toLowerCase();
  const notes = [];
  let mappedOccasions = [];

  if (legacyKey === "birthday") {
    mappedSubcategory = null;
    mappedOccasions = ["birthday"];
    notes.push("Birthday is mapped as an occasion; cake subcategory needs manual classification.");
  }
  if (legacyKey === "fruit" && name.includes("rasmalai")) {
    mappedSubcategory = null;
    notes.push("Rasmalai Cake needs manual cake-subcategory classification.");
  }
  if (legacyKey === "chocolate" && name.includes("belgium chocolate") && /premium/i.test(String(product.subcategory || ""))) {
    mappedSubcategory = null;
    notes.push("Belgium Chocolate has a legacy Premium Chocolate subcategory; manual classification is required.");
  }
  if (legacyKey === "birthday" && name.includes("boss")) {
    notes.push("Boss theme is not inferred; add a theme only after confirmation.");
  }
  if (mainCategory === "cakes" && !mappedSubcategory) {
    notes.push("No safe cake-subcategory mapping is available.");
  }
  if (!nonCakeCategories.has(legacyKey) && !knownCakeCategories.has(legacyKey)) {
    notes.push(`Unrecognized legacy category: ${legacyKey || "(missing)"}.`);
  }

  return {
    mainCategory,
    cakeSubcategory: mappedSubcategory,
    occasions: mappedOccasions,
    themes: [],
    notes,
  };
}

function mergeMigration(product, mapping) {
  const existingOccasions = Array.isArray(product.occasionIds) ? product.occasionIds : [];
  const existingThemes = Array.isArray(product.themes) ? product.themes : [];
  return {
    mainCategory: product.mainCategory || mapping.mainCategory,
    cakeSubcategory: product.cakeSubcategory || mapping.cakeSubcategory,
    occasionIds: [...new Set([...existingOccasions, ...mapping.occasions.filter((item) => occasions.has(item))])],
    themes: existingThemes,
  };
}

async function main() {
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is not configured in server/.env.");
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
  const db = mongoose.connection.db;
  const databaseName = mongoose.connection.name;
  if (apply && confirmedDatabase !== databaseName) {
    throw new Error(`Applying changes requires --confirm-db=${databaseName}.`);
  }
  if (apply && (/prod/i.test(databaseName) || process.env.NODE_ENV === "production") && !allowProduction) {
    throw new Error("Production database changes also require --confirm-production.");
  }

  const [products, categories] = await Promise.all([
    db.collection("products").find({}).toArray(),
    db.collection("categories").find({}, { projection: { legacyKey: 1 } }).toArray(),
  ]);
  const categoryKeysById = new Map(categories.map((category) => [String(category._id), category.legacyKey]));
  const rows = products.map((product) => {
    const categoryKey = product.legacyCategoryKey || categoryKeysById.get(String(product.category)) || "";
    const mapping = classify(product, categoryKey);
    return { product, categoryKey, mapping, result: mergeMigration(product, mapping) };
  });
  const unresolved = rows.filter(({ mapping }) => mapping.notes.some((note) => /manual|unrecognized|No safe/.test(note)));

  console.log(`Database: ${databaseName}`);
  console.log(`Products: ${rows.length}; requiring manual classification: ${unresolved.length}`);
  for (const { product, categoryKey, result, mapping } of rows) {
    console.log(JSON.stringify({
      id: String(product._id),
      name: product.name,
      legacyCategory: categoryKey || null,
      mainCategory: result.mainCategory,
      cakeSubcategory: result.cakeSubcategory,
      occasions: result.occasionIds,
      themes: result.themes,
      notes: mapping.notes,
    }));
  }

  if (!apply) {
    console.log("Dry run only. No database records were changed.");
    return;
  }
  if (unresolved.length && !allowUnclassified) {
    throw new Error("Manual classifications remain. Resolve them or explicitly pass --allow-unclassified.");
  }

  const backupDirectory = path.resolve(scriptDirectory, "../../backups");
  await fs.mkdir(backupDirectory, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = path.join(backupDirectory, `products-before-taxonomy-${timestamp}.ejson`);
  const backupHandle = await fs.open(backupPath, "wx", 0o600);
  try {
    await backupHandle.writeFile(mongoose.mongo.BSON.EJSON.stringify(products, { relaxed: false, indent: 2 }));
    await backupHandle.sync();
  } finally {
    await backupHandle.close();
  }
  const verifiedBackup = mongoose.mongo.BSON.EJSON.parse(await fs.readFile(backupPath, "utf8"));
  const originalIds = new Set(products.map((product) => String(product._id)));
  const verifiedIds = new Set(Array.isArray(verifiedBackup) ? verifiedBackup.map((product) => String(product._id)) : []);
  if (!Array.isArray(verifiedBackup) || verifiedBackup.length !== products.length
    || verifiedIds.size !== originalIds.size
    || verifiedBackup.some((product) => !originalIds.has(String(product._id)))) {
    throw new Error("The product backup failed verification; no migration changes were applied.");
  }
  console.log(`Product backup verified: ${verifiedBackup.length} product records.`);
  console.log(`Product backup created: ${backupPath}`);

  const operations = rows.map(({ product, result }) => {
    const set = {};
    if (!product.mainCategory) set.mainCategory = result.mainCategory;
    if (product.cakeSubcategory == null && result.cakeSubcategory) set.cakeSubcategory = result.cakeSubcategory;
    if (!Array.isArray(product.occasionIds)) set.occasionIds = result.occasionIds;
    if (!Array.isArray(product.themes)) set.themes = [];
    const update = {};
    if (Object.keys(set).length) update.$set = set;
    const newOccasions = Array.isArray(product.occasionIds)
      ? result.occasionIds.filter((occasion) => !product.occasionIds.includes(occasion))
      : [];
    if (newOccasions.length) update.$addToSet = { occasionIds: { $each: newOccasions } };
    return Object.keys(update).length ? {
      updateOne: { filter: { _id: product._id }, update },
    } : null;
  }).filter(Boolean);
  if (operations.length) await db.collection("products").bulkWrite(operations, { ordered: true });
  console.log(`Updated taxonomy fields on ${operations.length} product(s). Product IDs and non-taxonomy data were preserved.`);
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (mongoose.connection.readyState) await mongoose.disconnect();
  });
