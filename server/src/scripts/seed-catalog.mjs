import { createRequire } from "node:module";
import { menuByCategory, labels, bestSellerNames, productDescriptions } from "../../../client/src/features/menu/data/menuData.js";

const require = createRequire(import.meta.url);
const { connectDatabase, disconnectDatabase } = require("../config/db");
const Category = require("../models/category.model");
const Product = require("../models/product.model");
const ProductVariant = require("../models/product-variant.model");

const slugify = (value) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
const cakeCategories = new Set(["classic", "chocolate", "fruit"]);

function variantDefinitions(p500, p1kg) {
  const variants = [];
  if (p500 != null) variants.push({ label: "500 g", weightGrams: 500, price: p500 });
  if (p1kg != null) variants.push({ label: "1 kg", weightGrams: 1000, price: p1kg });
  if (!variants.length) throw new Error("A catalogue product must have at least one price.");
  return variants;
}

async function seedCatalog() {
  let categoryCount = 0;
  let productCount = 0;
  let variantCount = 0;
  const publishedSlugs = [];

  for (const [legacyKey, items] of Object.entries(menuByCategory)) {
    const categorySlug = slugify(legacyKey);
    const category = await Category.findOneAndUpdate(
      { legacyKey },
      { $set: { name: labels[legacyKey], slug: categorySlug, active: true } },
      { upsert: true, new: true, runValidators: true },
    );
    categoryCount += 1;

    for (const [name, p500, p1kg, status = "Active", subcategory = ""] of items) {
      const slug = `${categorySlug}-${slugify(name)}`;
      publishedSlugs.push(slug);
      const product = await Product.findOneAndUpdate(
        { slug },
        {
          $set: {
            name,
            description: productDescriptions[name] || "",
            category: category._id,
            legacyCategoryKey: legacyKey,
            subcategory,
            // Keep the catalogue image-free until final Cloudinary assets arrive.
            images: [],
            flavour: cakeCategories.has(legacyKey) ? name : "",
            dietary: { containsEgg: cakeCategories.has(legacyKey), egglessAvailable: cakeCategories.has(legacyKey) },
            customization: { messageAvailable: legacyKey === "custom" || legacyKey === "photo", photoAvailable: legacyKey === "photo", themeAvailable: legacyKey === "custom" },
            active: status === "Active",
            featured: bestSellerNames.has(name),
          },
          $setOnInsert: { slug },
        },
        { upsert: true, new: true, runValidators: true },
      );
      productCount += 1;

      const variantIds = [];
      for (const variant of variantDefinitions(p500, p1kg)) {
        const savedVariant = await ProductVariant.findOneAndUpdate(
          { product: product._id, label: variant.label },
          { $set: { ...variant, product: product._id, currency: "INR", active: status === "Active" } },
          { upsert: true, new: true, runValidators: true },
        );
        variantIds.push(savedVariant._id);
        variantCount += 1;
      }
      await Product.updateOne({ _id: product._id }, { $set: { variants: variantIds } });
    }
  }
  await Product.updateMany(
    { slug: { $nin: publishedSlugs } },
    { $set: { active: false, images: [] } },
  );
  console.log(`Seeded ${categoryCount} categories, ${productCount} products, and ${variantCount} variants.`);
}

try {
  await connectDatabase();
  await seedCatalog();
} catch (error) {
  console.error("Catalogue seed failed:", error.message);
  process.exitCode = 1;
} finally {
  await disconnectDatabase();
}
