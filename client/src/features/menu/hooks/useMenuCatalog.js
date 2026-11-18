import { useEffect, useMemo, useState } from "react";

import { cakeSubcategoryForLegacyKey, labels, mainCategoryForLegacyKey, occasionOptions } from "../data/menuData";
import { apiUrl } from "../../../utils/apiUrl";

const catalogueCache = new Map();

function mapProduct(product) {
  const variants = Array.isArray(product.variants) ? product.variants : [];
  const priceFor = (label) => variants.find((variant) => variant.label === label)?.price ?? null;
  const image = product.images?.[0];
  return {
    id: product._id,
    variants,
    name: product.name,
    category: product.legacyCategoryKey,
    mainCategory: product.mainCategory || mainCategoryForLegacyKey(product.legacyCategoryKey),
    cakeSubcategory: product.cakeSubcategory || (product.mainCategory ? "" : (product.legacyCategoryKey === "fruit" && /rasmalai/i.test(product.name)
      ? ""
      : cakeSubcategoryForLegacyKey(product.legacyCategoryKey))),
    categoryLabel: product.mainCategory === "cakes"
      ? labels[product.cakeSubcategory] || "Cake · Needs classification"
      : labels[product.mainCategory] || product.category?.name || "",
    occasionIds: Array.isArray(product.occasionIds) && product.occasionIds.length
      ? product.occasionIds
      : occasionOptions.some(([occasion]) => occasion === product.legacyCategoryKey) ? [product.legacyCategoryKey] : [],
    themes: Array.isArray(product.themes) ? product.themes : [],
    subcategory: product.mainCategory === "cakes"
      ? labels[product.cakeSubcategory] || ""
      : product.subcategory || "",
    p500: priceFor("500 g") ?? priceFor("Item") ?? variants[0]?.price ?? null,
    p1kg: priceFor("1 kg"),
    status: product.active ? "Active" : "Draft",
    available: variants.some((variant) => variant.stockQuantity == null || variant.stockQuantity > 0),
    createdAt: product.createdAt || "",
    image: typeof image === "string" ? image : image?.secure_url || image?.url || image?.localUrl || "",
    imageAlt: image?.alt || `${product.name} image`,
  };
}

export default function useMenuCatalog({ filters = {}, enabled = true, limit = 24, page = 1 } = {}) {
  const [result, setResult] = useState({ products: [], pagination: { page: 1, limit, total: 0, pages: 0 }, error: "", loading: true });
  const queryString = useMemo(() => {
    const params = new window.URLSearchParams();
    Object.entries({ ...filters, limit, page }).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") params.set(key, String(value));
    });
    return params.toString();
  }, [filters, limit, page]);

  useEffect(() => {
    if (!enabled) return undefined;
    const controller = new AbortController();
    setResult({ products: [], pagination: { page: Number(page), limit: Number(limit), total: 0, pages: 0 }, error: "", loading: true });
    async function loadCatalogue() {
      try {
        const cached = catalogueCache.get(queryString);
        if (cached) {
          setResult(cached);
          return;
        }
        const response = await fetch(apiUrl(`/api/products?${queryString}`), { signal: controller.signal, cache: "no-store" });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.message || `Catalogue request failed with ${response.status}`);
        if (!Array.isArray(payload?.data) || !payload?.pagination) throw new Error("Catalogue response is invalid");
        const next = {
          products: payload.data.map(mapProduct),
          pagination: payload.pagination,
          error: "",
          loading: false,
        };
        catalogueCache.set(queryString, next);
        setResult(next);
      } catch (error) {
        if (error.name !== "AbortError") setResult((current) => ({ ...current, products: [], error: error.message, loading: false }));
      }
    }
    loadCatalogue();
    return () => controller.abort();
  }, [enabled, limit, page, queryString]);

  return { ...result, loading: enabled && result.loading };
}
