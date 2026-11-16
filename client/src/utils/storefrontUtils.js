const publicBase = import.meta.env.BASE_URL.endsWith("/")
  ? import.meta.env.BASE_URL
  : `${import.meta.env.BASE_URL}/`;

// Images may come from Cloudinary, the API as an already-rooted `/images/...`
// path, or from the bundled public image folder as a bare filename.  Prefix
// only the last form; prefixing rooted paths produced `/images//images/...`
// URLs after deployment.
export const asset = (name) => {
  const image = typeof name === "object" && name !== null
    ? name.secure_url || name.url || name.localUrl
    : name;
  const value = String(image || "").trim();
  if (!value || /^(?:https?:|data:|blob:)/i.test(value) || value.startsWith("/")) return value;
  return `${publicBase}images/${value.replace(/^\.\/|^images\//i, "")}`;
};

export const responsiveImageSrcSet = (url) => {
  const value = String(url || "");
  const uploadIndex = value.indexOf("/upload/");
  if (!/res\.cloudinary\.com/i.test(value) || uploadIndex < 0) return undefined;
  const prefix = value.slice(0, uploadIndex + "/upload/".length);
  const remainder = value.slice(uploadIndex + "/upload/".length)
    .replace(/^c_limit,w_\d+,h_\d+\//, "")
    .replace(/^(?:q_auto:[^/]+\/)?(?:f_auto\/)?/, "");
  return [480, 800, 1200].map((width) => `${prefix}c_limit,w_${width},h_${width}/q_auto:good/f_auto/${remainder} ${width}w`).join(", ");
};

export const rupees = (value) =>
  value == null ? "—" : `₹${Number(value).toLocaleString("en-IN")}`;

export const whatsappOrderLink = (name, price, weight) =>
  `https://wa.me/919835888631?text=${encodeURIComponent(
    `Hello Darby's Pastries, I'd like to order ${name}${weight ? ` (${weight})` : ""}${price ? `, listed at ₹${price}` : ""}. Please confirm availability.`
  )}`;
