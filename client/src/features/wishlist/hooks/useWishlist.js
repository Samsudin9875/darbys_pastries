import { useContext } from "react";
import { StorefrontStateContext } from "../../storefront/StorefrontStateContext";

export default function useWishlist() {
  const state = useContext(StorefrontStateContext);
  if (!state) throw new Error("useWishlist must be used within StorefrontStateProvider.");
  const { wishlist, setWishlist } = state;

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