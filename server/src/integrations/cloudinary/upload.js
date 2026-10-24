const multer = require("multer");
const { requireCloudinary } = require("./client");

const MAX_IMAGE_SIZE_BYTES = 2 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const ALLOWED_FORMATS = new Set(["jpg", "png", "webp"]);

function invalidImage(message) {
  const error = new Error(message);
  error.status = 400;
  error.code = "invalid_image";
  return error;
}

function detectImageFormat(buffer) {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "jpg";
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "png";
  if (buffer.length >= 12 && buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP") return "webp";
  return "";
}

const productImageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_SIZE_BYTES, files: 6 },
  fileFilter: (_request, file, callback) => callback(ALLOWED_MIME_TYPES.has(file.mimetype) ? null : invalidImage("Upload a JPEG, PNG, or WebP image."), ALLOWED_MIME_TYPES.has(file.mimetype)),
});

function assertValidImage(file) {
  if (!file || !ALLOWED_MIME_TYPES.has(file.mimetype) || !file.buffer?.length) throw invalidImage("Upload a JPEG, PNG, or WebP image.");
  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    const error = new Error("Image files must be 2 MB or smaller.");
    error.status = 413;
    error.code = "file_too_large";
    throw error;
  }
  const format = detectImageFormat(file.buffer);
  if (!ALLOWED_FORMATS.has(format)) throw invalidImage("The uploaded file content is not a supported image.");
  return format;
}

function deliveryUrl(url, width, height, quality) {
  return url.replace("/upload/", `/upload/c_limit,w_${width},h_${height}/q_auto:${quality}/f_auto/`);
}

function uploadImage(file, { folder, publicId, profile = "product" }) {
  const format = assertValidImage(file);
  const cloudinary = requireCloudinary();
  return new Promise((resolve, reject) => {
    const dimensions = profile === "hero" ? { width: 1920, height: 1080 } : { width: 1200, height: 1200 };
    const stream = cloudinary.uploader.upload_stream({ folder, public_id: publicId, resource_type: "image", format, overwrite: false, unique_filename: false, allowed_formats: [...ALLOWED_FORMATS], transformation: [{ ...dimensions, crop: "limit", quality: "auto:good" }] }, (error, result) => {
      if (error) return reject(error);
      const delivery = profile === "hero" ? deliveryUrl(result.secure_url, 1920, 1080, "good") : deliveryUrl(result.secure_url, 700, 700, "eco");
      return resolve({ secure_url: delivery, public_id: result.public_id });
    });
    stream.end(file.buffer);
  });
}

async function destroyImage(publicId) {
  if (!publicId) return;
  const cloudinary = requireCloudinary();
  await cloudinary.uploader.destroy(publicId, { resource_type: "image", invalidate: true });
}

module.exports = { ALLOWED_MIME_TYPES, MAX_IMAGE_SIZE_BYTES, assertValidImage, productImageUpload, uploadImage, destroyImage };
