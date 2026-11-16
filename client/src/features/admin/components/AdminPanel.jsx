import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuthToken } from "../../../app/authToken";
import {
  defaultCakeMenuGroups,
  labels,
  mainCategoryOptions,
  cakeSubcategoryOptions,
  cakeSizeOptions,
  occasionOptions,
  themeOptions as defaultThemeOptions,
  mainCategoryForLegacyKey,
  cakeSubcategoryForLegacyKey,
  mergeCakeMenuGroups,
} from "../../menu/data/menuData";
import { apiUrl } from "../../../utils/apiUrl";
const tabs = [
  "Dashboard",
  "Products",
  "Homepage",
  "Orders",
  "Custom Requests",
  "Delivery",
  "Coupons",
  "Reviews",
  "Inventory",
  "Customers",
  "Settings",
];
const fallback = {
  eyebrow: "Handcrafted with love",
  title: "Freshly Baked Cakes For Every Celebration",
  description:
    "Choose from our client-approved cake flavours, desserts, flowers and chocolates.",
  badge: "Starting from ₹350",
  image: "101920fbaa29.jpg",
  imageSecond: "9c4c74910c48.jpg",
  imageThird: "2a95b9ea83e2.jpg",
};
const defaultCategories = [
  { id: "classic", label: "Classic Cakes", detail: "Black Forest Classic, White Forest, Vanilla Truffle", image: "", action: "classic" },
  { id: "chocolate", label: "Chocolate Cakes", detail: "Double Chocolate, Choco Chips, Choco Truffle, Choco Oreo Forest, Belgium Chocolate", image: "", action: "chocolate" },
  { id: "fruit", label: "Fruit Cakes", detail: "Pineapple, Mango, Strawberry, Blueberry", image: "", action: "fruit" },
  { id: "special", label: "Premium & Special Cakes", detail: "Rasmalai, Irish Coffee, Dry Fruit", image: "", action: "special" },
  { id: "photo", label: "Photo Cakes", detail: "Photo cakes and custom designs", image: "", action: "photo" },
  { id: "desserts", label: "Desserts", detail: "Donuts, brownies and more", image: "", action: "desserts" },
];
const defaultGiftCategories = [
  { id: "flowers", label: "Flowers", detail: "Fresh blooms for every celebration", image: "", action: "flowers", active: true },
  { id: "chocolates", label: "Chocolates", detail: "Sweet gifts, ready to share", image: "", action: "chocolates", active: true },
  { id: "accessories", label: "Cake Accessories", detail: "Birthday essentials and finishing touches", image: "", action: "accessories", active: true },
  { id: "gift-hampers", label: "Gift Hampers", detail: "Curated celebration hampers, ready to gift", image: "", action: "gift-hampers", active: true },
];
const cleanGiftCategories = (items) =>
  defaultGiftCategories.map((fallback) => {
    const item = items.find((entry) => entry.id === fallback.id) || fallback;
    return {
      ...fallback,
      ...item,
      id: fallback.id,
      action: fallback.action,
      label: String(item.label || fallback.label),
      detail: String(item.detail || fallback.detail),
      image: String(item.image || ""),
      active: item.active !== false,
    };
  });
const productCategories = [
  ...mainCategoryOptions,
  ...cakeSubcategoryOptions.map(([key, label]) => [`cake:${key}`, label]),
];
const toggleValue = (values, value, checked) => checked
  ? [...new Set([...values, value])]
  : values.filter((entry) => entry !== value);
const uniqueThemes = (themes) => [...new Map(themes.map((theme) => String(theme).trim()).filter(Boolean).map((theme) => [theme.toLowerCase(), theme])).values()];
const toggleTheme = (themes, theme, checked) => {
  const existing = themes.find((value) => value.toLowerCase() === theme.toLowerCase());
  if (checked) return existing ? themes : [...themes, theme];
  return themes.filter((value) => value.toLowerCase() !== theme.toLowerCase());
};
const isImage = (f) =>
  f &&
  ["image/jpeg", "image/png", "image/webp"].includes(f.type) &&
  f.size <= 2097152;
const prepareCategoryImage = async (file) => {
  if (!file?.type?.startsWith("image/")) return null;
  if (isImage(file)) return file;
  const source = URL.createObjectURL(file);
  try {
    const image = await new Promise((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = reject;
      element.src = source;
    });
    const scale = Math.min(1, 1200 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
    const compressed = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.82));
    return compressed && isImage(new File([compressed], "category-image.jpg", { type: "image/jpeg" }))
      ? new File([compressed], "category-image.jpg", { type: "image/jpeg" })
      : null;
  } catch { return null; } finally { URL.revokeObjectURL(source); }
};
export default function AdminPanel({ onClose, hero = fallback, onHeroChange }) {
  const token = useAuthToken(),
    [access, setAccess] = useState("checking"),
    [tab, setTab] = useState("Dashboard"),
    [items, setItems] = useState([]),
    [orders, setOrders] = useState([]),
    [stats, setStats] = useState({}),
    [note, setNote] = useState(""),
    [adding, setAdding] = useState(false),
    [editing, setEditing] = useState(null),
    [busy, setBusy] = useState(false),
    [search, setSearch] = useState(""),
    [filter, setFilter] = useState("all"),
    [page, setPage] = useState(1),
    [draft, setDraft] = useState(hero),
    [cakeMenuGroups, setCakeMenuGroups] = useState(defaultCakeMenuGroups),
    [categories, setCategories] = useState(defaultCategories),
    [giftCategories, setGiftCategories] = useState(defaultGiftCategories),
    [giftsVisible, setGiftsVisible] = useState(true),
    [sectionVisibility, setSectionVisibility] = useState({ bestSellers: true, occasionTheme: true, addOns: true, reviews: true }),
    [themeSettings, setThemeSettings] = useState(defaultThemeOptions.map(([, label]) => label)),
    [newThemeOption, setNewThemeOption] = useState(""),
    [featuredProducts, setFeaturedProducts] = useState(null),
    [reviewHighlights, setReviewHighlights] = useState([
      { quote: "A wide choice of familiar flavours, with eggless and custom-design options when the occasion calls for something personal.", name: "Birthday cake order", place: "KR Puram, Bengaluru", rating: 5 },
      { quote: "From a half-kilo cake to a larger celebration centrepiece, it is easy to find the right size and flavour.", name: "Family celebration", place: "Bengaluru", rating: 5 },
      { quote: "Indian-inspired flavours such as Rasmalai sit alongside rich chocolate favourites for a menu with range.", name: "Flavour discovery", place: "KR Puram, Bengaluru", rating: 5 },
    ]),
    [newMainCategory, setNewMainCategory] = useState("cakes"),
    [newCakeSubcategory, setNewCakeSubcategory] = useState("classic"),
    [newCakePrices, setNewCakePrices] = useState([{ label: "500 g", price: "" }]),
    [newOccasionIds, setNewOccasionIds] = useState([]),
    [newThemes, setNewThemes] = useState([]),
    [newCustomThemes, setNewCustomThemes] = useState("");
  const categoryLabels = labels;
  const availableThemeOptions = useMemo(() => {
    const options = new Map();
    themeSettings.forEach((theme) => options.set(theme.trim().toLowerCase(), [theme, theme]));
    items.flatMap((item) => item.themes || []).forEach((theme) => {
      const key = theme.trim().toLowerCase();
      if (key) options.set(key, [theme, options.get(key)?.[1] || theme]);
    });
    return [...options.values()];
  }, [items, themeSettings]);
  const api = useCallback(async (path, opts = {}) =>
    fetch(apiUrl(path), {
      ...opts,
      headers: { Authorization: `Bearer ${await token()}`, ...opts.headers },
    }), [token]);
  const load = useCallback(async () => {
    const [p, d] = await Promise.all([
      api("/api/admin/products"),
      api("/api/admin/dashboard"),
    ]);
    if (p.ok) {
      const products = (await p.json()).data;
      setItems(products);
      setFeaturedProducts((current) => current || Object.fromEntries(
        ["flowers", "chocolates", "accessories", "gift-hampers"].map((category) => [
          category,
          products.filter((product) => product.active && (product.mainCategory || mainCategoryForLegacyKey(product.legacyCategoryKey)) === category).slice(0, 2).map((product) => product._id),
        ]),
      ));
    }
    if (d.ok) setStats((await d.json()).data);
  }, [api]);
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (!(await api("/api/admin")).ok) throw Error();
        await load();
        const r = await api("/api/admin/site-settings");
        if (r.ok) {
          const x = await r.json();
          if (x.data?.hero) setDraft(x.data.hero);
          if (Array.isArray(x.data?.cakeMenuGroups)) setCakeMenuGroups(mergeCakeMenuGroups(x.data.cakeMenuGroups));
          if (Array.isArray(x.data?.categories)) setCategories(defaultCategories.map((fallback) => {
            const saved = x.data.categories.find((item) => item.id === fallback.id || (fallback.id === "photo" && item.id === "custom")) || {};
            return { ...fallback, ...saved, id: fallback.id, action: saved.action === "custom" ? "photo" : (saved.action || fallback.action) };
          }));
          if (Array.isArray(x.data?.giftCategories)) setGiftCategories(defaultGiftCategories.map((fallback) => ({
            ...fallback,
            ...(x.data.giftCategories.find((item) => item.id === fallback.id) || {}),
          })));
          if (typeof x.data?.giftsVisible === "boolean") setGiftsVisible(x.data.giftsVisible);
          if (x.data?.sectionVisibility) setSectionVisibility((current) => ({ ...current, ...x.data.sectionVisibility }));
          if (Array.isArray(x.data?.themeOptions)) setThemeSettings(x.data.themeOptions);
          if (Array.isArray(x.data?.reviewHighlights)) setReviewHighlights(x.data.reviewHighlights.slice(0, 3));
          if (x.data?.featuredProducts) setFeaturedProducts(x.data.featuredProducts);
        }
        if (mounted) setAccess("allowed");
      } catch {
        if (mounted) setAccess("denied");
      }
    })();
    return () => (mounted = false);
  }, [api, load]);
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => (document.body.style.overflow = prev);
  }, []);
  useEffect(() => setPage(1), [search, filter]);
  useEffect(() => {
    if (tab === "Orders")
      api("/api/orders/admin")
        .then((r) => (r.ok ? r.json() : null))
        .then((x) => x && setOrders(x.data || []));
  }, [api, tab]);
  const filtered = useMemo(
      () =>
        items.filter(
          (p) =>
            (filter === "all" || p.legacyCategoryKey === filter
              || (filter.startsWith("cake:") ? (p.cakeSubcategory || (p.mainCategory ? "" : cakeSubcategoryForLegacyKey(p.legacyCategoryKey))) === filter.slice(5) : (p.mainCategory || mainCategoryForLegacyKey(p.legacyCategoryKey)) === filter)) &&
            p.name.toLowerCase().includes(search.toLowerCase()),
        ),
      [items, search, filter],
    ),
    pages = Math.max(1, Math.ceil(filtered.length / 8)),
    rows = filtered.slice((page - 1) * 8, page * 8);
  const run = async (job, ok) => {
    setBusy(true);
    setNote("");
    try {
      const result = await job();
      setNote(typeof ok === "function" ? ok(result) : ok);
      await load();
    } catch (e) {
      setNote(e.message || "Could not complete that action.");
    } finally {
      setBusy(false);
    }
  };
  const add = async (e) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget),
      files = form.getAll("images").filter(Boolean);
    const categoryKey = newMainCategory === "cakes" ? newCakeSubcategory : newMainCategory;
    const isCakeProduct = newMainCategory === "cakes";
    form.set("mainCategory", newMainCategory);
    form.set("cakeSubcategory", isCakeProduct ? newCakeSubcategory : "");
    form.set("category", categoryKey);
    form.set("occasionIds", JSON.stringify(isCakeProduct ? newOccasionIds : []));
    const customThemes = newCustomThemes.split(",").map((theme) => theme.trim()).filter(Boolean);
    form.set("themes", JSON.stringify(uniqueThemes(isCakeProduct ? [...newThemes, ...customThemes] : [])));
    if (isCakeProduct) {
      const cakeVariants = newCakePrices.flatMap(({ label, price: rawPrice }) => {
        const priceValue = String(rawPrice || "").trim();
        if (!priceValue) return [];
        const price = Number(priceValue);
        const weightGrams = cakeSizeOptions.find(([size]) => size === label)?.[1];
        return Number.isFinite(price) && price > 0 ? [{ label, weightGrams, price }] : [];
      });
      if (!cakeVariants.length) return setNote("Enter a price for at least one cake size.");
      form.set("variants", JSON.stringify(cakeVariants));
    } else {
      const variantLabel = String(form.get("variantLabel") || "").trim();
      const variantPrice = String(form.get("variantPrice") || "").trim();
      const variantStock = String(form.get("variantStock") || "").trim();
      if (variantLabel || variantPrice || variantStock) {
        if (variantPrice === "") return setNote("Enter an option price, or leave all option fields blank.");
        form.set("variants", JSON.stringify([{ label: variantLabel || "Standard", price: Number(variantPrice), stockQuantity: variantStock === "" ? null : Number(variantStock) }]));
      }
    }
    form.delete("price500");
    form.delete("price1kg");
    if (files.some((f) => !isImage(f)))
      return setNote("Images must be JPEG, PNG or WebP and 2 MB or smaller.");
    await run(async () => {
      const r = await api("/api/admin/products", {
          method: "POST",
          body: form,
        }),
        x = await r.json();
      if (!r.ok) throw Error(x.message);
      setAdding(false);
      setNewMainCategory("cakes");
      setNewCakeSubcategory("classic");
      setNewCakePrices([{ label: "500 g", price: "" }]);
      setNewOccasionIds([]);
      setNewThemes([]);
      setNewCustomThemes("");
    }, "Product saved and images uploaded.");
  };
  const upload = (id, file, replace = false, index = 0) => {
    if (!isImage(file))
      return setNote("Choose a JPEG, PNG or WebP image under 2 MB.");
    return run(
      async () => {
        const f = new FormData();
        f.append("image", file);
        const r = await api(
            `/api/admin/products/${id}/images${replace ? `/${index}` : ""}`,
            { method: replace ? "PUT" : "POST", body: f },
          ),
          x = await r.json();
        if (!r.ok) throw Error(x.message);
      },
      replace ? "Main image updated." : "Image uploaded.",
    );
  };
  const remove = (id, index) => {
    if (
      !window.confirm(
        index == null
          ? "Delete this product permanently from the catalogue? Existing orders will remain unchanged."
          : "Remove this image?",
      )
    )
      return;
    return run(
      async () => {
        const r = await api(
            index == null
              ? `/api/admin/products/${id}`
              : `/api/admin/products/${id}/images/${index}`,
            { method: "DELETE" },
          ),
          x = await r.json();
        if (!r.ok) throw Error(x.message);
        return x.data;
      },
      index == null
        ? (result) => result.imageCleanupPending
          ? "Product deleted. Some Cloudinary images could not be removed; check the server logs."
          : "Product deleted."
        : "Image removed.",
    );
  };
  const openEditor = (product) => setEditing({
    id: product._id,
    name: product.name || "",
    description: product.description || "",
    flavour: product.flavour || "",
    category: product.legacyCategoryKey || "classic",
    mainCategory: product.mainCategory || mainCategoryForLegacyKey(product.legacyCategoryKey),
    cakeSubcategory: product.cakeSubcategory || (product.mainCategory ? "" : cakeSubcategoryForLegacyKey(product.legacyCategoryKey)),
    occasionIds: product.occasionIds || [],
    themes: product.themes || [],
    customThemes: "",
    active: product.active !== false,
    featured: product.featured === true,
    images: (product.images || []).map((image) => image.secure_url || image.url).filter(Boolean),
    variants: (product.variants || []).filter((variant) => product.active === false || variant.active !== false).map((variant) => ({ _id: variant._id, label: variant.label || "", price: variant.price ?? "", weightGrams: variant.weightGrams ?? "", stockQuantity: variant.stockQuantity ?? "" })),
  });
  const saveProduct = (event) => {
    event.preventDefault();
    return run(async () => {
      const { customThemes, ...productData } = editing;
      const themes = uniqueThemes(editing.mainCategory === "cakes" ? [...(editing.themes || []), ...customThemes.split(",").map((theme) => theme.trim()).filter(Boolean)] : []);
      const response = await api(`/api/admin/products/${editing.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...productData,
          category: editing.mainCategory === "cakes" ? editing.cakeSubcategory : editing.mainCategory,
          themes,
          featured: editing.featured,
          occasionIds: editing.mainCategory === "cakes" ? editing.occasionIds : [],
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw Error(payload.message);
      setEditing(null);
    }, "Product updated.");
  };
  const saveHero = (e) => {
    e.preventDefault();
    return run(async () => {
      const r = await api("/api/admin/site-settings", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ hero: draft }),
        }),
        x = await r.json();
      if (!r.ok) throw Error(x.message);
      onHeroChange(x.data.hero);
    }, "Homepage saved.");
  };
  const uploadHeroImage = (field, file) => {
    if (!isImage(file)) return setNote("Choose a JPEG, PNG or WebP image under 2 MB.");
    return run(async () => {
      const form = new FormData(); form.append("image", file);
      const response = await api(`/api/admin/site-settings/hero-image/${field}`, { method: "POST", body: form });
      const payload = await response.json(); if (!response.ok) throw Error(payload.message);
      setDraft(current => ({ ...current, [field]: payload.data.url })); onHeroChange({ ...draft, [field]: payload.data.url });
    }, "Homepage image optimized and uploaded.");
  };
  const saveCategories = () => run(async () => {
    const r = await api("/api/admin/site-settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ categories, cakeMenuGroups }) });
    const x = await r.json(); if (!r.ok) throw Error(x.message);
    setCategories(x.data.categories || []);
    setCakeMenuGroups(mergeCakeMenuGroups(x.data.cakeMenuGroups || defaultCakeMenuGroups));
  }, "Categories saved.");
  const saveHomepageContent = () => run(async () => {
    const response = await api("/api/admin/site-settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sectionVisibility, themeOptions: themeSettings, reviewHighlights, featuredProducts: featuredProducts || { flowers: [], chocolates: [], accessories: [], "gift-hampers": [] } }),
    });
    const payload = await response.json();
    if (!response.ok) throw Error(payload.message);
  }, "Homepage sections, themes and review highlights saved.");
  const toggleFeaturedProduct = (category, productId, checked) => {
    setFeaturedProducts((current) => {
      const selected = current || { flowers: [], chocolates: [], accessories: [], "gift-hampers": [] };
      const categoryProducts = selected[category] || [];
      if (checked && categoryProducts.length >= 2) {
        setNote("Select no more than two featured products per store category.");
        return current;
      }
      return {
        ...selected,
        [category]: checked
          ? [...categoryProducts, productId]
          : categoryProducts.filter((id) => id !== productId),
      };
    });
  };
  const updateCategory = (id, field, value) => setCategories((current) => current.map((category) => category.id === id ? { ...category, [field]: value } : category));
  const uploadCategoryImage = async (id, file) => {
    const preparedFile = await prepareCategoryImage(file);
    if (!preparedFile) return setNote("Image could not be optimized. Please choose a different image.");
    return run(async () => {
      const settingsResponse = await api("/api/admin/site-settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ categories }) });
      const settingsPayload = await settingsResponse.json();
      if (!settingsResponse.ok) throw Error(settingsPayload.message);
      const form = new FormData();
      form.append("image", preparedFile);
      const r = await api(`/api/admin/site-settings/category-image/${id}`, { method: "POST", body: form });
      const x = await r.json(); if (!r.ok) throw Error(x.message);
      setCategories((current) => current.map((category) => category.id === id ? { ...category, image: x.data.url, imagePublicId: x.data.publicId } : category));
    }, "Category image uploaded.");
  };
  const saveGiftCategories = () => run(async () => {
    const safeGiftCategories = cleanGiftCategories(giftCategories);
    const r = await api("/api/admin/site-settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ giftCategories: safeGiftCategories, giftsVisible }) });
    const x = await r.json(); if (!r.ok) throw Error(x.message);
    setGiftCategories(x.data.giftCategories || []); setGiftsVisible(x.data.giftsVisible !== false);
  }, "Gifts & Celebrations settings saved.");
  const updateGiftCategory = (id, field, value) => setGiftCategories((current) => current.map((category) => category.id === id ? { ...category, [field]: value } : category));
  const uploadGiftCategoryImage = async (id, file) => {
    const preparedFile = await prepareCategoryImage(file);
    if (!preparedFile) return setNote("Image could not be optimized. Please choose a different image.");
    return run(async () => {
      const form = new FormData(); form.append("image", preparedFile);
      const r = await api(`/api/admin/site-settings/category-image/${id}`, { method: "POST", body: form });
      const x = await r.json(); if (!r.ok) throw Error(x.message);
      setGiftCategories((current) => current.map((category) => category.id === id ? { ...category, image: x.data.url, imagePublicId: x.data.publicId } : category));
    }, "Gift category image uploaded.");
  };
  const updateOrder = (order, patch) =>
    run(async () => {
      const r = await api(`/api/orders/admin/${order._id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        }),
        x = await r.json();
      if (!r.ok) throw Error(x.message);
      setOrders((a) => a.map((o) => (o._id === order._id ? x.data : o)));
    }, "Order updated.");
  if (access !== "allowed")
    return (
      <section className="admin-preview open">
        <main className="admin-main">
          <div className="admin-placeholder">
            <h3>
              {access === "checking"
                ? "Checking admin access…"
                : "Admin access required"}
            </h3>
            <p>Only authorized administrators can manage this store.</p>
            <button className="btn btn-primary" onClick={onClose}>
              Close
            </button>
          </div>
        </main>
      </section>
    );
  return (
    <section className="admin-preview open">
      <div className="admin-shell">
        <aside className="admin-sidebar">
          <strong className="admin-brand">DARBY'S PASTRIES</strong>
          <p className="admin-side-label">Management</p>
          <nav className="admin-menu">
            {tabs.map((x) => (
              <button
                key={x}
                className={`admin-menu-button ${tab === x ? "active" : ""}`}
                onClick={() => setTab(x)}
              >
                {x}
              </button>
            ))}
          </nav>
        </aside>
        <div className="admin-workspace">
          <header className="admin-topbar">
            <div>
              <h2>{tab}</h2>
              <p>Store management</p>
            </div>
            <button className="admin-close" onClick={onClose}>
              ×
            </button>
          </header>
          <main className="admin-main">
            {note && (
              <p className="admin-form-status" role="status">
                {note}
              </p>
            )}
            {tab === "Dashboard" && (
              <>
                <div className="admin-welcome">
                  <div>
                    <h3>Catalogue overview</h3>
                    <p>Live data from your store database.</p>
                  </div>
                </div>
                <div className="admin-stats">
                  {[
                    ["Products", stats.totalProducts, "Catalogue items"],
                    [
                      "Published",
                      stats.activeProducts,
                      "Visible on storefront",
                    ],
                    ["Drafts", stats.draftProducts, "Not yet published"],
                    ["Media", stats.totalImages, "Cloudinary images"],
                  ].map((x) => (
                    <article className="admin-stat" key={x[0]}>
                      <span>{x[0]}</span>
                      <strong>{x[1] ?? "—"}</strong>
                      <small>{x[2]}</small>
                    </article>
                  ))}
                </div>
                <section className="admin-card admin-recent">
                  <div className="admin-card-head">
                    <h3>Recent activity</h3>
                    <span>MongoDB</span>
                  </div>
                  {stats.recentProducts?.map((p) => (
                    <div className="admin-snapshot-row" key={p._id}>
                      <strong>{p.name}</strong>
                      <span>
                        {p.active ? "Published" : "Draft"} ·{" "}
                        {new Date(p.updatedAt).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </section>
              </>
            )}
            {tab === "Products" && (
              <>
                <div className="admin-page-head">
                  <div>
                    <h3>Products</h3>
                    <p>Manage catalogue details and Cloudinary media.</p>
                  </div>
                  <button
                    className="admin-add-product"
                    onClick={() => setAdding(true)}
                  >
                    + Add product
                  </button>
                </div>
                <section className="admin-card">
                  <div className="admin-product-tools">
                    <input
                      className="admin-product-search"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search products…"
                    />
                    <select
                      value={filter}
                      onChange={(e) => setFilter(e.target.value)}
                    >
                      <option value="all">All categories</option>
                      {productCategories.map(([k, v]) => (
                        <option key={k} value={k}>
                          {v}
                        </option>
                      ))}
                    </select>
                    <span className="admin-product-count">
                      {filtered.length} products
                    </span>
                  </div>
                  <div className="admin-table">
                    <div className="admin-table-row header">
                      <span>Product</span>
                      <span>Category</span>
                      <span>Status</span>
                      <span>Media</span>
                      <span>Actions</span>
                    </div>
                    {rows.map((p) => (
                      <div className="admin-table-row" key={p._id}>
                        <span className="admin-product-name">
                          {p.images?.[0] && (
                            <img
                              src={p.images[0].secure_url || p.images[0].url}
                              alt=""
                            />
                          )}
                          {p.name}
                        </span>
                        <span>
                          {p.mainCategory === "cakes" && !p.cakeSubcategory ? "Cakes · Needs classification" : labels[p.cakeSubcategory || (p.mainCategory ? "" : cakeSubcategoryForLegacyKey(p.legacyCategoryKey))] || categoryLabels[p.mainCategory || mainCategoryForLegacyKey(p.legacyCategoryKey)] || p.category?.name || p.legacyCategoryKey}
                        </span>
                        <span className="admin-status">
                                  {p.archivedAt ? "Archived" : p.active ? "Active" : "Draft"}
                        </span>
                        <span>{p.images?.length || 0} images</span>
                        <span className="navigation-actions">
                          <button className="admin-mini-action" type="button" onClick={() => openEditor(p)}>Update</button>
                          <button
                            className="admin-delete-product"
                            type="button"
                            onClick={() => remove(p._id)}
                          >
                            Delete
                          </button>
                        </span>
                      </div>
                    ))}
                  </div>
                  {!rows.length && (
                    <div className="admin-empty">
                      <strong>No products found</strong>
                      <span>Adjust the search or category filter.</span>
                    </div>
                  )}
                  <div className="admin-pagination">
                    <button
                      disabled={page === 1}
                      onClick={() => setPage(page - 1)}
                    >
                      Previous
                    </button>
                    <span>
                      Page {page} of {pages}
                    </span>
                    <button
                      disabled={page === pages}
                      onClick={() => setPage(page + 1)}
                    >
                      Next
                    </button>
                  </div>
                </section>
              </>
            )}
            {tab === "Homepage" && (
              <>
              <form className="hero-editor admin-card" onSubmit={saveHero}>
                <div className="hero-editor-form">
                  <div className="hero-editor-fields">
                    {Object.entries(draft).map(([k, v]) => (
                      <label className="field full" key={k}>
                        {k}
                        {["title", "description"].includes(k) ? (
                          <textarea
                            value={v}
                            maxLength="500"
                            onChange={(e) =>
                              setDraft({ ...draft, [k]: e.target.value })
                            }
                          />
                        ) : ["image", "imageSecond", "imageThird"].includes(k) ? (
                          <div className="hero-image-field">
                            {v && <img src={v} alt={`Current ${k} homepage image`} />}
                            <span><input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => uploadHeroImage(k, e.target.files[0])} /><small>Current image shown. Choose a file to replace it.</small></span>
                          </div>
                        ) : (
                          <input
                            value={v}
                            maxLength="500"
                            onChange={(e) =>
                              setDraft({ ...draft, [k]: e.target.value })
                            }
                          />
                        )}
                      </label>
                    ))}
                  </div>
                  <div className="hero-editor-actions">
                    <button className="btn btn-primary" disabled={busy}>
                      Save homepage
                    </button>
                  </div>
                </div>
                <aside className="hero-editor-preview">
                  <strong>Live preview</strong>
                  <div className="hero-editor-preview-visual"><img src={draft.image} alt="Homepage preview" /></div>
                  <div className="hero-editor-preview-copy"><span>{draft.eyebrow}</span><h4>{draft.title}</h4><p>{draft.description}</p></div>
                </aside>
              </form>
              <section className="admin-card category-editor">
                <div className="category-editor-head"><div><span>Homepage collection &amp; navigation</span><h3>Shop by Category</h3><small>Edit the six fixed cake category cards and the categories shown in the Cakes dropdown here.</small></div></div>
                <div className="cake-menu-category-editor">
                  <div className="category-editor-head"><div><span>Cakes navbar</span><h3>Cake categories</h3><small>The Cakes dropdown shows the six cake categories and a Custom Cake link to its ordering form. Shop by Occasion remains separate.</small></div></div>
                  <div className="cake-menu-admin-groups">
                    {cakeMenuGroups.map((group) => <section className="cake-menu-admin-group" key={group.id}>
                      <strong>{group.title}</strong>
                      <div className="cake-menu-admin-items">{group.items.map((item) => <div className="cake-menu-admin-item" key={item.id}><span>{item.label}</span></div>)}</div>
                    </section>)}
                  </div>
                  <div className="hero-editor-actions">
                    <button type="button" className="btn btn-primary" disabled={busy} onClick={saveCategories}>Save Cakes navbar</button>
                  </div>
                </div>
                <div className="category-admin-grid">
                  {categories.map((category) => <article className="category-admin-card" key={category.id}>
                    <div className="category-admin-image">{category.image ? <img src={category.image} alt={category.label} /> : <div className="category-admin-placeholder">Add image</div>}<label className="category-upload">{category.image ? "Update image" : "Add image"}<input type="file" accept="image/*" onChange={(e) => { uploadCategoryImage(category.id, e.target.files[0]); e.target.value = ""; }} /></label></div>
                    <div className="category-admin-fields"><label>Title<input value={category.label} maxLength="80" onChange={(e) => updateCategory(category.id, "label", e.target.value)} /></label>
                    <label>Details<textarea value={category.detail} maxLength="300" onChange={(e) => updateCategory(category.id, "detail", e.target.value)} /></label>
                    </div>
                  </article>)}
                </div>
                <div className="hero-editor-actions"><button type="button" className="btn btn-primary" disabled={busy} onClick={saveCategories}>Save categories</button></div>
              </section>
              <section className="admin-card category-editor">
                <div className="category-editor-head"><div><span>Homepage collections</span><h3>Store categories</h3><small>Set images, details and active status for Flowers, Chocolates, Cake Accessories and Gift Hampers.</small></div><label className="admin-toggle">Show Gift Hampers section <input type="checkbox" checked={giftsVisible} onChange={(e) => setGiftsVisible(e.target.checked)} /></label></div>
                <div className="category-admin-grid">{giftCategories.map((category) => <article className="category-admin-card" key={category.id}>
                  <div className="category-admin-image">{category.image ? <img src={category.image} alt={category.label} /> : <div className="category-admin-placeholder">Add image</div>}<label className="category-upload">{category.image ? "Update image" : "Add image"}<input type="file" accept="image/*" onChange={(e) => { uploadGiftCategoryImage(category.id, e.target.files[0]); e.target.value = ""; }} /></label></div>
                  <div className="category-admin-fields"><label>Title<input value={category.label} maxLength="80" onChange={(e) => updateGiftCategory(category.id, "label", e.target.value)} /></label><label>Details<textarea value={category.detail} maxLength="300" onChange={(e) => updateGiftCategory(category.id, "detail", e.target.value)} /></label><label>Active <input type="checkbox" checked={category.active !== false} onChange={(e) => updateGiftCategory(category.id, "active", e.target.checked)} /></label></div>
                </article>)}</div>
                <div className="hero-editor-actions"><button type="button" className="btn btn-primary" disabled={busy} onClick={saveGiftCategories}>Save Store Categories</button></div>
              </section>
              <section className="admin-card category-editor">
                <div className="category-editor-head"><div><span>Homepage content</span><h3>Sections, themes &amp; reviews</h3><small>Best Sellers are selected on each product. Themes and review highlights are saved with homepage settings.</small></div></div>
                <div className="admin-product-form-grid">
                  {Object.entries({ bestSellers: "Best Sellers", occasionTheme: "Occasions & themes", addOns: "Flowers, chocolates & gifts", reviews: "Customer review highlights" }).map(([key, label]) => <label className="admin-product-choice" key={key}><input type="checkbox" checked={sectionVisibility[key]} onChange={(event) => setSectionVisibility((current) => ({ ...current, [key]: event.target.checked }))} /><span>Show {label}</span></label>)}
                </div>
                <div className="field full"><strong>Theme options</strong><div className="admin-product-choice-list">{themeSettings.map((theme) => <label className="admin-product-choice" key={theme}><span>{theme}</span><button type="button" className="admin-mini-action" onClick={() => setThemeSettings((current) => current.filter((value) => value !== theme))}>Remove</button></label>)}</div><div className="category-admin-fields"><label>Add theme<input value={newThemeOption} maxLength="50" onChange={(event) => setNewThemeOption(event.target.value)} placeholder="e.g. Jungle Safari" /></label><button type="button" className="btn btn-secondary" onClick={() => { const theme = newThemeOption.trim(); if (theme && !themeSettings.some((value) => value.toLowerCase() === theme.toLowerCase())) setThemeSettings((current) => [...current, theme]); setNewThemeOption(""); }}>Add theme</button></div></div>
                <div className="field full"><strong>Featured add-on products (choose up to 2 per category)</strong>{["flowers", "chocolates", "accessories", "gift-hampers"].map((category) => <fieldset className="admin-product-choice-list" key={category}><legend>{categoryLabels[category]}</legend>{items.filter((product) => product.active && (product.mainCategory || mainCategoryForLegacyKey(product.legacyCategoryKey)) === category).map((product) => <label className="admin-product-choice" key={product._id}><input type="checkbox" checked={(featuredProducts?.[category] || []).includes(product._id)} onChange={(event) => toggleFeaturedProduct(category, product._id, event.target.checked)} /><span>{product.name}</span></label>)}</fieldset>)}</div>
                <div className="field full"><strong>Featured customer reviews (up to 3)</strong>{reviewHighlights.map((review, index) => <div className="admin-product-form-grid" key={`review-${index}`}><label className="field full">Review<input maxLength="500" value={review.quote} onChange={(event) => setReviewHighlights((current) => current.map((item, position) => position === index ? { ...item, quote: event.target.value } : item))} /></label><label className="field">Customer name<input maxLength="100" value={review.name} onChange={(event) => setReviewHighlights((current) => current.map((item, position) => position === index ? { ...item, name: event.target.value } : item))} /></label><label className="field">Location<input maxLength="100" value={review.place} onChange={(event) => setReviewHighlights((current) => current.map((item, position) => position === index ? { ...item, place: event.target.value } : item))} /></label><label className="field">Rating<select value={review.rating} onChange={(event) => setReviewHighlights((current) => current.map((item, position) => position === index ? { ...item, rating: Number(event.target.value) } : item))}>{[5, 4, 3, 2, 1].map((rating) => <option key={rating} value={rating}>{rating} stars</option>)}</select></label></div>)}</div>
                <div className="hero-editor-actions"><button type="button" className="btn btn-primary" disabled={busy} onClick={saveHomepageContent}>Save Homepage Content</button></div>
              </section>
              </>
            )}
            {!["Dashboard", "Products", "Homepage"].includes(tab) && (
              <div className="admin-empty">
                <strong>{tab}</strong>
                <span>
                  This workflow is not yet connected to a persistent backend
                  model.
                </span>
              </div>
            )}
          </main>
        </div>
      </div>
      {editing && (
        <div className="admin-product-modal">
          <div className="admin-product-dialog">
            <div className="admin-product-dialog-head"><h3>Edit product</h3><button className="admin-close" type="button" onClick={() => setEditing(null)}>×</button></div>
            <form className="admin-product-form" onSubmit={saveProduct}>
              <div className="admin-product-form-grid">
                <label className="field full">Name<input required maxLength="140" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></label>
                <label className="field full">Description<textarea maxLength="2000" value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} /></label>
                <label className="field">Flavour<input maxLength="100" value={editing.flavour} onChange={(e) => setEditing({ ...editing, flavour: e.target.value })} /></label>
                <label className="field">Main category<select value={editing.mainCategory} onChange={(e) => setEditing({ ...editing, mainCategory: e.target.value, ...(e.target.value === "cakes" ? {} : { occasionIds: [], themes: [], customThemes: "" }) })}>{mainCategoryOptions.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
                {editing.mainCategory === "cakes" && <label className="field">Cake subcategory<select required value={editing.cakeSubcategory || ""} onChange={(e) => setEditing({ ...editing, cakeSubcategory: e.target.value })}><option value="">Choose a subcategory</option>{cakeSubcategoryOptions.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>}
                {editing.mainCategory === "cakes" && <><div className="field full"><strong>Occasions</strong><div className="admin-product-choice-list">{occasionOptions.map(([key, label]) => <label className="admin-product-choice" key={key}><input type="checkbox" checked={editing.occasionIds.includes(key)} onChange={(e) => setEditing({ ...editing, occasionIds: toggleValue(editing.occasionIds, key, e.target.checked) })} /><span>{label}</span></label>)}</div></div>
                <div className="field full"><strong>Themes</strong><div className="admin-product-choice-list">{availableThemeOptions.map(([key, label]) => <label className="admin-product-choice" key={key}><input type="checkbox" checked={editing.themes.some((theme) => theme.toLowerCase() === key.toLowerCase())} onChange={(e) => setEditing({ ...editing, themes: toggleTheme(editing.themes, key, e.target.checked) })} /><span>{label}</span></label>)}</div><label className="field">Additional themes<input value={editing.customThemes} onChange={(e) => setEditing({ ...editing, customThemes: e.target.value })} placeholder="Comma-separated theme names" /></label></div></>}
                <label className="field">Status<select value={editing.active ? "Active" : "Draft"} onChange={(e) => setEditing({ ...editing, active: e.target.value === "Active" })}><option>Active</option><option>Draft</option></select></label>
                <label className="admin-product-choice"><input type="checkbox" checked={editing.featured} onChange={(event) => setEditing({ ...editing, featured: event.target.checked })} /><span>Show in Best Sellers</span></label>
                <div className="field full"><strong>Current product images</strong><div className="category-admin-grid">{editing.images.length ? editing.images.map((image, index) => <div className="category-admin-image" key={image}><img src={image} alt={`${editing.name} ${index + 1}`} /><label className="category-upload">Change image<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => { const file = e.target.files[0]; if (file) upload(editing.id, file, true, index); e.target.value = ""; }} /></label></div>) : <div className="category-admin-placeholder">No image added</div>}</div><label className="field">Add another image<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => { const file = e.target.files[0]; if (file) upload(editing.id, file); e.target.value = ""; }} /></label><small>Every selected image is uploaded to Cloudinary. Existing images stay visible until you replace them.</small></div>
                <div className="field full"><strong>{editing.mainCategory === "cakes" ? "Cake sizes and prices" : "Prices / options"}</strong>{editing.variants.map((variant, index) => <div className="admin-product-form-grid" key={index}>
                  <label className="field">{editing.mainCategory === "cakes" ? "Cake size" : "Option"}{editing.mainCategory === "cakes" ? <select required value={variant.label} onChange={(e) => setEditing({ ...editing, variants: editing.variants.map((item, position) => position === index ? { ...item, label: e.target.value, weightGrams: cakeSizeOptions.find(([label]) => label === e.target.value)?.[1] ?? item.weightGrams } : item) })}>{!cakeSizeOptions.some(([label]) => label === variant.label) && <option value={variant.label}>{variant.label}</option>}{cakeSizeOptions.map(([label]) => <option key={label} value={label} disabled={editing.variants.some((item, position) => position !== index && item.label === label)}>{label}</option>)}</select> : <input required maxLength="40" value={variant.label} onChange={(e) => setEditing({ ...editing, variants: editing.variants.map((item, position) => position === index ? { ...item, label: e.target.value } : item) })} />}</label>
                  <label className="field">Price<input required type="number" min="0" value={variant.price} onChange={(e) => setEditing({ ...editing, variants: editing.variants.map((item, position) => position === index ? { ...item, price: e.target.value } : item) })} /></label>
                  {editing.mainCategory !== "cakes" && <label className="field">Weight (g)<input type="number" min="0" value={variant.weightGrams} onChange={(e) => setEditing({ ...editing, variants: editing.variants.map((item, position) => position === index ? { ...item, weightGrams: e.target.value } : item) })} /></label>}
                  <label className="field">Stock<input type="number" min="0" value={variant.stockQuantity} onChange={(e) => setEditing({ ...editing, variants: editing.variants.map((item, position) => position === index ? { ...item, stockQuantity: e.target.value } : item) })} /></label>
                  <button type="button" className="admin-action danger" disabled={editing.variants.length === 1} onClick={() => setEditing({ ...editing, variants: editing.variants.filter((_, position) => position !== index) })}>Remove option</button>
                </div>)}</div>
                <button type="button" className="btn btn-secondary" disabled={editing.mainCategory === "cakes" && (editing.variants.length >= 2 || !cakeSizeOptions.some(([label]) => !editing.variants.some((variant) => variant.label === label)))} onClick={() => {
                  if (editing.mainCategory === "cakes") {
                    const [label, weightGrams] = cakeSizeOptions.find(([size]) => !editing.variants.some((variant) => variant.label === size)) || [];
                    if (label) setEditing({ ...editing, variants: [...editing.variants, { label, price: "", weightGrams, stockQuantity: "" }] });
                    return;
                  }
                  setEditing({ ...editing, variants: [...editing.variants, { label: "", price: "", weightGrams: "", stockQuantity: "" }] });
                }}>{editing.mainCategory === "cakes" ? " + Add cake size (max 2)" : "+ Add price option"}</button>
              </div>
              <div className="admin-product-form-actions"><button type="button" className="btn btn-secondary" onClick={() => setEditing(null)}>Cancel</button><button className="btn btn-primary" disabled={busy}>{busy ? "Saving…" : "Save changes"}</button></div>
            </form>
          </div>
        </div>
      )}
      {adding && (
        <div className="admin-product-modal">
          <div className="admin-product-dialog">
            <div className="admin-product-dialog-head">
              <h3>Add product</h3>
              <button className="admin-close" onClick={() => setAdding(false)}>
                ×
              </button>
            </div>
            <form className="admin-product-form" onSubmit={add}>
              <div className="admin-product-form-grid">
                <label className="field full">
                  Name
                  <input name="name" required maxLength="140" />
                </label>
                <label className="field">Main category<select value={newMainCategory} onChange={(e) => { setNewMainCategory(e.target.value); if (e.target.value !== "cakes") { setNewOccasionIds([]); setNewThemes([]); setNewCustomThemes(""); } }}>{mainCategoryOptions.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
                {newMainCategory === "cakes" && <label className="field">Cake subcategory<select value={newCakeSubcategory} onChange={(e) => setNewCakeSubcategory(e.target.value)}>{cakeSubcategoryOptions.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>}
                {newMainCategory === "cakes" && <><div className="field full"><strong>Occasions</strong><div className="admin-product-choice-list">{occasionOptions.map(([key, label]) => <label className="admin-product-choice" key={key}><input type="checkbox" checked={newOccasionIds.includes(key)} onChange={(e) => setNewOccasionIds((values) => toggleValue(values, key, e.target.checked))} /><span>{label}</span></label>)}</div></div>
                <div className="field full"><strong>Themes</strong><div className="admin-product-choice-list">{availableThemeOptions.map(([key, label]) => <label className="admin-product-choice" key={key}><input type="checkbox" checked={newThemes.includes(key)} onChange={(e) => setNewThemes((values) => toggleValue(values, key, e.target.checked))} /><span>{label}</span></label>)}</div><label className="field">Additional themes<input value={newCustomThemes} onChange={(e) => setNewCustomThemes(e.target.value)} placeholder="Comma-separated theme names" /></label></div></>}
                <label className="field">
                  Status
                  <select name="status">
                    <option>Active</option>
                    <option>Draft</option>
                  </select>
                </label>
                <label className="admin-product-choice"><input type="checkbox" name="featured" value="true" /><span>Show in Best Sellers</span></label>
                {newMainCategory === "cakes" && <div className="field full"><strong>Cake sizes and prices</strong>{newCakePrices.map((option, index) => <div className="admin-product-form-grid" key={`cake-size-${index}`}>
                  <label className="field">Cake size<select value={option.label} onChange={(event) => setNewCakePrices((current) => current.map((item, position) => position === index ? { ...item, label: event.target.value } : item))}>{cakeSizeOptions.map(([label]) => <option key={label} value={label} disabled={newCakePrices.some((item, position) => position !== index && item.label === label)}>{label}</option>)}</select></label>
                  <label className="field">Price<input type="number" min="1" value={option.price} onChange={(event) => setNewCakePrices((current) => current.map((item, position) => position === index ? { ...item, price: event.target.value } : item))} /></label>
                  <button type="button" className="admin-action danger" disabled={newCakePrices.length === 1} onClick={() => setNewCakePrices((current) => current.filter((_, position) => position !== index))}>Remove size</button>
                </div>)}<button type="button" className="btn btn-secondary" disabled={newCakePrices.length >= 2 || !cakeSizeOptions.some(([label]) => !newCakePrices.some((item) => item.label === label))} onClick={() => {
                  const [label] = cakeSizeOptions.find(([size]) => !newCakePrices.some((item) => item.label === size)) || [];
                  if (label) setNewCakePrices((current) => [...current, { label, price: "" }]);
                }}>+ Add cake size (max 2)</button></div>}
                {newMainCategory !== "cakes" && <><label className="field">
                  Gift/accessory option
                  <input name="variantLabel" maxLength="40" placeholder="Optional: e.g. Bouquet / Pack of 12 / Number 5" />
                </label>
                <label className="field">
                  Option price
                  <input name="variantPrice" required={newMainCategory !== "cakes"} type="number" min="0" placeholder="Actual selling price" />
                </label>
                <label className="field">
                  Stock (optional)
                  <input name="variantStock" type="number" min="0" step="1" placeholder="Leave blank for made-to-order" />
                </label></>}
                <label className="field full">
                  Product images
                  <input
                    name="images"
                    type="file"
                    multiple
                    accept="image/jpeg,image/png,image/webp"
                  />
                  <small>JPEG, PNG or WebP · max 5 MB each</small>
                </label>
              </div>
              <div className="admin-product-form-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setAdding(false)}
                >
                  Cancel
                </button>
                <button className="btn btn-primary" disabled={busy}>
                  {busy ? "Saving…" : "Save product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
