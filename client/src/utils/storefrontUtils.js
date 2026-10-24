export const asset = (name) => /^https?:\/\//.test(name || "") ? name : `/images/${name}`;

export const rupees = (value) =>
  value == null ? "—" : `₹${Number(value).toLocaleString("en-IN")}`;

export const whatsappOrderLink = (name, price, weight) =>
  `https://wa.me/919835888631?text=${encodeURIComponent(
    `Hello Darby's Pastries, I'd like to order ${name}${weight ? ` (${weight})` : ""}${price ? `, listed at ₹${price}` : ""}. Please confirm availability.`
  )}`;
