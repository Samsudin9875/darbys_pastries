require("dotenv").config();

const fs = require("fs/promises");
const path = require("path");
const { connectDatabase, disconnectDatabase } = require("../config/db");
const Product = require("../models/product.model");
const SiteSetting = require("../models/site-setting.model");
const { requireCloudinary } = require("../integrations/cloudinary/client");
const { uploadImage } = require("../integrations/cloudinary/upload");

const imageDirectory = path.resolve(__dirname, "../../../client/public/images");
const keep = [
  ["image", "101920fbaa29.jpg", "hero-image-main"],
  ["imageSecond", "9c4c74910c48.jpg", "hero-image-second"],
  ["imageThird", "2a95b9ea83e2.jpg", "hero-image-third"],
  ["customCakeSummaryImage", "custom-cake-summary.jpg", "custom-cake-summary"],
];

async function uploadLocalImage(fileName, publicId, profile) {
  const buffer = await fs.readFile(path.join(imageDirectory, fileName));
  return uploadImage({ buffer, size: buffer.length, mimetype: "image/jpeg" }, {
    folder: profile === "hero" ? "cakes/homepage" : "cakes/custom-cake-summary",
    publicId,
    profile,
  });
}

async function listCloudinaryImages(cloudinary) {
  const images = [];
  let nextCursor;
  do {
    const result = await cloudinary.api.resources({ type: "upload", resource_type: "image", max_results: 500, next_cursor: nextCursor });
    images.push(...result.resources);
    nextCursor = result.next_cursor;
  } while (nextCursor);
  return images;
}

async function main() {
  const cloudinary = requireCloudinary();
  const uploaded = {};
  for (const [key, fileName, publicId] of keep) uploaded[key] = await uploadLocalImage(fileName, publicId, key === "customCakeSummaryImage" ? "product" : "hero");

  await connectDatabase();
  const existing = await SiteSetting.findOne({ key: "homepage" }).lean();
  const hero = { ...(existing?.value?.hero || {}) };
  for (const key of ["image", "imageSecond", "imageThird"]) hero[key] = uploaded[key].secure_url;
  await SiteSetting.findOneAndUpdate(
    { key: "homepage" },
    { value: { ...(existing?.value || {}), hero, customCakeSummaryImage: uploaded.customCakeSummaryImage.secure_url } },
    { upsert: true, new: true },
  );
  const cleared = await Product.updateMany({ "images.0": { $exists: true } }, { $set: { images: [] } });

  const retained = new Set(Object.values(uploaded).map((image) => image.public_id));
  const staleIds = (await listCloudinaryImages(cloudinary)).map((image) => image.public_id).filter((publicId) => !retained.has(publicId));
  for (let index = 0; index < staleIds.length; index += 100) {
    await cloudinary.api.delete_resources(staleIds.slice(index, index + 100), { resource_type: "image", invalidate: true });
  }
  console.log(`Kept ${retained.size} images and permanently deleted ${staleIds.length} Cloudinary images. Cleared images from ${cleared.modifiedCount} products.`);
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; }).finally(() => disconnectDatabase());
