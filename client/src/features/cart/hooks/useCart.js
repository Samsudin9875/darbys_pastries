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

  const buildOrderCartLink = () => {
    const lines = [
      "Hello Darby's Pastries, I'd like to order:",
      ...cart.map((item) => `${item.quantity} × ${item.name} (${item.weight}) — ${rupees(item.price * item.quantity)}`),
      `Total: ${rupees(cartTotal)}`,
      "Please confirm availability and final price.",
    ];
    return `https://wa.me/919835888631?text=${encodeURIComponent(lines.join("\n"))}`;
  };

  return { cart, cartCount, cartTotal, addToCart, updateCartQuantity, buildOrderCartLink };
}