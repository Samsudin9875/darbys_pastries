import { useEffect, useMemo, useState } from "react";

import { allProducts, bestSellerNames, labels } from "../data/menuData";
import { apiUrl } from "../../../utils/apiUrl";

export default function useMenuCatalog({ activeCategory, activeFilter, query }) {
  const [apiProducts, setApiProducts] = useState(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadCatalogue() {
      try {
        const response = await fetch(apiUrl("/api/products"), { signal: controller.signal, cache: "no-store" });
        if (!response.ok) throw new Error(`Catalogue request failed with ${response.status}`);
        const payload = await response.json();
        if (!Array.isArray(payload?.data)) throw new Error("Catalogue response is invalid");

        setApiProducts(payload.data.map((product) => {
          const variants = Array.isArray(product.variants) ? product.variants : [];
          const priceFor = (label) => variants.find((variant) => variant.label === label)?.price ?? null;
          // The admin image endpoint appends an image, so the newest upload is
          // the one the storefront should show after its next refresh.
          const image = product.images?.at(-1);
          return {
            id: product._id,
            variants,
            name: product.name,
            category: product.legacyCategoryKey,
            subcategory: product.subcategory || "",
            p500: priceFor("500 g") ?? priceFor("Item") ?? variants[0]?.price ?? null,
            p1kg: priceFor("1 kg"),
            status: product.active ? "Active" : "Draft",
            image: image?.secure_url || image?.url || "",
            imageAlt: image?.alt || `${product.name} image`,
          };
        }));
      } catch (error) {
        if (error.name !== "AbortError") setApiProducts([]);
      }
    }

    loadCatalogue();
    return () => controller.abort();
  }, []);

  const productList = useMemo(() => apiProducts?.length ? apiProducts : allProducts(), [apiProducts]);

  const visibleProducts = useMemo(() => {
    const search = query.trim().toLowerCase();
    const source = productList.filter((product) => product.status === "Active");

    const filterMatch = (product) => {
      if (!activeFilter || activeFilter.kind === "all") return true;
      if (activeFilter.kind === "product") return product.name === activeFilter.value;
      if (activeFilter.kind === "category") return product.category === activeFilter.value;
      if (activeFilter.kind === "subcategory") return product.subcategory === activeFilter.value;
      if (activeFilter.kind === "chocolate")
        return product.category !== "chocolates" && /choco|chocolate|truffle|black forest|ferrero|oreo|kit kat|cappuccino|brownie/i.test(product.name);
      if (activeFilter.kind === "fruit")
        return /pine apple|strawberry|black currant|mango|blueberry|green apple|fruit|royal cherry|italian cassata/i.test(product.name);
      if (activeFilter.kind === "special")
        return product.category === "special" || /rasmalai|irish coffee|caramel butterscotch|dry fruit|mango almond|honey almond/i.test(product.name);
      if (activeFilter.kind === "eggless") return !["desserts", "flowers", "chocolates"].includes(product.category);
      if (activeFilter.kind === "500g") return product.p500 != null && !["desserts", "flowers", "chocolates"].includes(product.category);
      if (activeFilter.kind === "1kg") return product.p1kg != null;
      if (activeFilter.kind === "bestseller") return bestSellerNames.has(product.name);
      return true;
    };

    let base = source.filter((product) => {
      if (activeFilter) return filterMatch(product);
      return product.category === activeCategory;
    });

    if (search) {
      base = source.filter((product) => {
        const haystack = `${product.name} ${labels[product.category] || ""} ${product.category} ${product.subcategory || ""}`.toLowerCase();
        return haystack.includes(search);
      });
    }

    if (activeFilter?.kind === "bestseller") {
      return base.filter((product, index, items) => items.findIndex((item) => item.name === product.name) === index).slice(0, 8);
    }

    return base;
  }, [activeCategory, activeFilter, productList, query]);

  return visibleProducts;
}
