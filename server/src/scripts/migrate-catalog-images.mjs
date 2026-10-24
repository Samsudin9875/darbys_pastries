import { createRequire } from "node:module";
import fs from "node:fs/promises";
import path from "node:path";

const require = createRequire(import.meta.url);
const { connectDatabase, disconnectDatabase } = require("../config/db");
const Product = require("../models/product.model");
const { requireCloudinary } = require("../integrations/cloudinary/client");
const { uploadImage } = require("../integrations/cloudinary/upload");

const clientPublicDirectory = path.resolve(process.cwd(), "../client/public");
const mimeByExtension = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp" };

function errorMessage(error) {
  return error?.message || error?.error?.message || error?.error?.error?.message || "Unknown Cloudinary or MongoDB error.";
}

function sourcePathFor(localUrl) {
  if (!localUrl?.startsWith("/images/")) throw new Error(`Unsupported legacy image path: ${localUrl || "(empty)"}`);
  const sourcePath = path.resolve(clientPublicDirectory, `.${localUrl}`);
  if (!sourcePath.startsWith(`${clientPublicDirectory}${path.sep}`)) throw new Error("Legacy image path is outside client/public.");
  return sourcePath;
}

async function existingCloudinaryAsset(publicId) {
  const cloudinary = requireCloudinary();
  try {
    const asset = await cloudinary.api.resource(publicId, { resource_type: "image" });
    return { secure_url: asset.secure_url, public_id: asset.public_id };
  } catch (error) {
    const status = error?.http_code || error?.error?.http_code;
    if (status === 404 || errorMessage(error).startsWith("Resource not found")) return null;
    throw error;
  }
}

async function migrateImage(product, image, index) {
  if (image.public_id && image.secure_url) return false;
  const localUrl = image.localUrl || image.url;
  const sourcePath = sourcePathFor(localUrl);
  const extension = path.extname(sourcePath).toLowerCase();
  const mimetype = mimeByExtension[extension];
  if (!mimetype) throw new Error(`Unsupported legacy image format: ${sourcePath}`);

  const publicId = `cakes/products/${product.slug}-${index}`;
  let uploaded = await existingCloudinaryAsset(publicId);
  if (!uploaded) {
    const buffer = await fs.readFile(sourcePath);
    try {
      uploaded = await uploadImage({ buffer, size: buffer.length, mimetype }, { folder: "cakes/products", publicId: `${product.slug}-${index}` });
    } catch (error) {
      if (error.http_code !== 409) throw error;
      uploaded = await existingCloudinaryAsset(publicId);
      if (!uploaded) throw error;
    }
  }

  image.localUrl = localUrl;
  image.url = uploaded.secure_url;
  image.secure_url = uploaded.secure_url;
  image.public_id = uploaded.public_id;
  return true;
}

async function migrateCatalogImages() {
  requireCloudinary();
  const products = await Product.find({ "images.0": { $exists: true } }).sort({ name: 1 });
  let migrated = 0;
  for (const product of products) {
    let changed = false;
    for (let index = 0; index < product.images.length; index += 1) {
      changed = (await migrateImage(product, product.images[index], index)) || changed;
    }
    if (changed) {
      await product.save();
      migrated += 1;
    }
  }
  console.log(`Migrated Cloudinary image metadata for ${migrated} products.`);
}

try {
  requireCloudinary();
  await connectDatabase();
  await migrateCatalogImages();
} catch (error) {
  console.error("Catalogue image migration failed:", errorMessage(error));
  if (error?.http_code) console.error(`Cloudinary HTTP status: ${error.http_code}`);
  process.exitCode = 1;
} finally {
  await disconnectDatabase();
}
