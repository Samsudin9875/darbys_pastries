import { useState } from "react";

import { rupees } from "../../../utils/storefrontUtils";

export default function useCart() {
  const [cart, setCart] = useState([]);

  const addToCart = (item) => {
    setCart((current) => {
      const existing = current.find(
        (entry) => entry.name === item.name && entry.weight === item.weight && entry.category === item.category,
      );

      if (existing) {
        return current.map((entry) =>
          entry.name === item.name && entry.weight === item.weight && entry.category === item.category
            ? { ...entry, quantity: entry.quantity + 1 }
            : entry,
        );
      }

      return [...current, { ...item, quantity: 1 }];
    });
  };

  const updateCartQuantity = (item, delta) => {
    setCart((current) =>
      current.flatMap((entry) => {
        if (entry.name !== item.name || entry.weight !== item.weight || entry.category !== item.category) {
          return [entry];
        }
        const nextQty = entry.quantity + delta;
        return nextQty > 0 ? [{ ...entry, quantity: nextQty }] : [];
      }),
    );
  };

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = cart.reduce((sum, item) => sum + Number(item.price) * Number(item.quantity), 0);

  const buildOrderCartLink = (customer = {}) => {
    const lines = [
      "Hello Darby's Pastries, I'd like to order:",
      customer.orderId ? `Order ID: ${customer.orderId}` : "",
      ...cart.map((item) => `${item.quantity} × ${item.name} (${item.weight}) — ${rupees(item.price * item.quantity)}`),
      `Total: ${rupees(cartTotal)}`,
      `Customer: ${customer.name || "Not provided"}`,
      `WhatsApp: ${customer.phone || "Not provided"}`,
      `Fulfilment: ${customer.deliveryType || "Store Pickup"}`,
      customer.deliveryType === "Home Delivery" ? `Address: ${customer.address}, ${customer.pincode}` : "",
      "Please confirm availability, delivery charge and final price.",
    ].filter(Boolean);
    return `https://wa.me/919835888631?text=${encodeURIComponent(lines.join("\n"))}`;
  };

  return { cart, cartCount, cartTotal, addToCart, updateCartQuantity, buildOrderCartLink };
}
