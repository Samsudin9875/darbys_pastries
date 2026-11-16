import { useContext } from "react";

import { rupees } from "../../../utils/storefrontUtils";
import { StorefrontStateContext } from "../../storefront/StorefrontStateContext";

export default function useCart() {
  const state = useContext(StorefrontStateContext);
  if (!state) throw new Error("useCart must be used within StorefrontStateProvider.");
  const { cart, setCart } = state;
  const itemKey = (item) => item.cartId || `${item.category || "product"}:${item.name}:${item.variantId || item.weight || "default"}`;
  const sameItem = (first, second) => itemKey(first) === itemKey(second);

  const addToCart = (item) => {
    setCart((current) => {
      const existing = current.find((entry) => sameItem(entry, item));

      if (existing) {
        return current.map((entry) =>
          sameItem(entry, item)
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
        if (!sameItem(entry, item)) {
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
