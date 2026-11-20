import { mkdir, readdir, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import sharp from "sharp";

const imageExtensions = new Set([".jpg", ".jpeg", ".png", ".webp"]);
const args = new Map(process.argv.slice(2).map((arg) => {
  const [key, value = "true"] = arg.replace(/^--/, "").split("=");
  return [key, value];
}));
const sourceDirectory = path.resolve(args.get("input") || "public/images");
const outputDirectory = path.resolve(args.get("output") || "public/images-optimized");
const maxWidth = Number(args.get("max-width") || 1600);
const quality = Number(args.get("quality") || 82);
const overwrite = args.has("overwrite");

if (!Number.isInteger(maxWidth) || maxWidth < 1 || !Number.isInteger(quality) || quality < 1 || quality > 100) {
  throw new Error("--max-width must be a positive integer and --quality must be between 1 and 100.");
}

const formatBytes = (bytes) => `${(bytes / 1024).toFixed(bytes < 1024 * 1024 ? 1 : 2)} KB`;

async function findImages(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return findImages(entryPath);
    return imageExtensions.has(path.extname(entry.name).toLowerCase()) ? [entryPath] : [];
  }));
  return files.flat();
}

const sourceFiles = await findImages(sourceDirectory);
if (!sourceFiles.length) {
  console.log(`No supported images found in ${sourceDirectory}`);
  process.exit(0);
}

let totalBefore = 0;
let totalAfter = 0;
let created = 0;
let skipped = 0;

for (const sourcePath of sourceFiles) {
  const relativePath = path.relative(sourceDirectory, sourcePath);
  const destinationPath = path.join(outputDirectory, relativePath).replace(/\.[^.]+$/, ".webp");
  const destinationInfo = await stat(destinationPath).catch(() => null);
  if (destinationInfo && !overwrite) {
    console.log(`SKIP  ${relativePath} (already exists; use --overwrite to regenerate)`);
    skipped += 1;
    continue;
  }

  await mkdir(path.dirname(destinationPath), { recursive: true });
  const sourceInfo = await stat(sourcePath);
  const metadata = await sharp(sourcePath).metadata();
  await sharp(sourcePath)
    .rotate()
    .resize({ width: maxWidth, withoutEnlargement: true })
    .webp({ quality, effort: 5 })
    .toFile(destinationPath);
  const outputInfo = await stat(destinationPath);
  totalBefore += sourceInfo.size;
  totalAfter += outputInfo.size;
  created += 1;
  const dimensions = `${metadata.width || "?"}×${metadata.height || "?"}`;
  const saving = ((1 - outputInfo.size / sourceInfo.size) * 100).toFixed(1);
  console.log(`WRITE ${relativePath} (${dimensions})  ${formatBytes(sourceInfo.size)} → ${formatBytes(outputInfo.size)} (${saving}% smaller)`);
}

console.log(`\nCreated: ${created}; skipped: ${skipped}`);
if (created) console.log(`Total: ${formatBytes(totalBefore)} → ${formatBytes(totalAfter)} (${((1 - totalAfter / totalBefore) * 100).toFixed(1)}% smaller)`);
console.log(`Originals remain unchanged in ${sourceDirectory}. Optimized copies are in ${outputDirectory}.`);
