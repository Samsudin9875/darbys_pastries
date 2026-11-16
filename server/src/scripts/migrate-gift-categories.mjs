import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { connectDatabase, disconnectDatabase } = require("../config/db");
const Category = require("../models/category.model");

const categories = [
  { name: "Classic Cakes", slug: "classic-cakes", legacyKey: "classic" },
  { name: "Chocolate & Truffle Cakes", slug: "chocolate-truffle-cakes", legacyKey: "chocolate" },
  { name: "Fruit Cakes", slug: "fruit-cakes", legacyKey: "fruit" },
  { name: "Premium & Special Cakes", slug: "premium-special-cakes", legacyKey: "special" },
  { name: "Photo & Custom Cakes", slug: "photo-custom-cakes", legacyKey: "custom" },
  { name: "Desserts", slug: "desserts", legacyKey: "desserts" },
  { name: "Flowers", slug: "flowers", legacyKey: "flowers" },
  { name: "Chocolates", slug: "chocolates", legacyKey: "chocolates" },
  { name: "Cake Accessories", slug: "cake-accessories", legacyKey: "accessories" },
  { name: "Birthday Cakes", slug: "birthday-cakes", legacyKey: "birthday" },
  { name: "Anniversary Cakes", slug: "anniversary-cakes", legacyKey: "anniversary" },
  { name: "Festival Cakes", slug: "festival-cakes", legacyKey: "festival" },
];

try {
  await connectDatabase();
  for (const category of categories) await Category.findOneAndUpdate({ legacyKey: category.legacyKey }, { $set: { ...category, active: true } }, { upsert: true, new: true, runValidators: true });
  console.log("Admin product categories are ready. No products or prices were created.");
} catch (error) {
  console.error("Gift category migration failed:", error.message);
  process.exitCode = 1;
} finally {
  await disconnectDatabase();
}
