import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import mongoose from "mongoose";
import dotenv from "dotenv";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(scriptDirectory, "../../.env") });

const backupArgument = process.argv.slice(2).find((arg) => !arg.startsWith("--"));
const confirmedDatabase = process.argv.slice(2).find((arg) => arg.startsWith("--confirm-db="))?.slice("--confirm-db=".length);
const taxonomyFields = ["mainCategory", "cakeSubcategory", "occasionIds", "themes"];

async function main() {
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is not configured in server/.env.");
  if (!backupArgument || !confirmedDatabase) {
    throw new Error("Provide a backup filename and --confirm-db=<exact database name>.");
  }
  const backupDirectory = path.resolve(scriptDirectory, "../../backups");
  const backupPath = path.resolve(backupDirectory, backupArgument);
  if (path.dirname(backupPath) !== backupDirectory) {
    throw new Error("The rollback backup must be located in server/backups.");
  }
  const products = mongoose.mongo.BSON.EJSON.parse(await fs.readFile(backupPath, "utf8"));
  if (!Array.isArray(products) || !products.length || products.some((product) => !product?._id)) {
    throw new Error("The selected backup does not contain a valid product snapshot.");
  }

  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
  const databaseName = mongoose.connection.name;
  if (confirmedDatabase !== databaseName) {
    throw new Error(`Rolling back requires --confirm-db=${databaseName}.`);
  }
  const collection = mongoose.connection.db.collection("products");
  const operations = [];
  for (const product of products) {
    const set = {};
    const unset = {};
    for (const field of taxonomyFields) {
      if (Object.hasOwn(product, field)) set[field] = product[field];
      else unset[field] = "";
    }
    const update = {};
    if (Object.keys(set).length) update.$set = set;
    if (Object.keys(unset).length) update.$unset = unset;
    operations.push({ updateOne: { filter: { _id: product._id }, update } });
  }
  const result = await collection.bulkWrite(operations, { ordered: true });
  console.log(`Restored taxonomy fields for ${result.matchedCount} existing products in ${databaseName}.`);
  console.log("Product IDs, images, prices, variants, stock, and orders were not restored or modified.");
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (mongoose.connection.readyState) await mongoose.disconnect();
  });
