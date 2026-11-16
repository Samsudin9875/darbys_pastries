import { useState } from "react";

import { StorefrontStateContext } from "./StorefrontStateContext";

export default function StorefrontStateProvider({ children }) {
  const [cart, setCart] = useState([]);
  const [wishlist, setWishlist] = useState([]);

  return (
    <StorefrontStateContext.Provider value={{ cart, setCart, wishlist, setWishlist }}>
      {children}
    </StorefrontStateContext.Provider>
  );
}
