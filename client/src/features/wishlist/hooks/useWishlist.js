import { useState } from "react";

export default function useWishlist() {
  const [wishlist, setWishlist] = useState([]);

  const toggleWishlist = (item) => {
    setWishlist((current) => {
      const exists = current.some((entry) => entry.name === item.name && entry.category === item.category);
      if (exists) {
        return current.filter((entry) => !(entry.name === item.name && entry.category === item.category));
      }
      return [...current, { ...item, quantity: 1 }];
    });
  };

  return { wishlist, setWishlist, wishlistCount: wishlist.length, toggleWishlist };
}