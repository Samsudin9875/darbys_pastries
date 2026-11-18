import { useEffect, useState } from "react";

import { StorefrontStateContext } from "./StorefrontStateContext";

export default function StorefrontStateProvider({ children }) {
  const load = (key) => {
    try { return JSON.parse(window.localStorage.getItem(key)) || []; } catch { return []; }
  };
  const [cart, setCart] = useState(() => load("darbys-cart"));
  const [wishlist, setWishlist] = useState(() => load("darbys-wishlist"));

  useEffect(() => { window.localStorage.setItem("darbys-cart", JSON.stringify(cart)); }, [cart]);
  useEffect(() => { window.localStorage.setItem("darbys-wishlist", JSON.stringify(wishlist)); }, [wishlist]);

  return (
    <StorefrontStateContext.Provider value={{ cart, setCart, wishlist, setWishlist }}>
      {children}
    </StorefrontStateContext.Provider>
  );
}
