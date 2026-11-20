import { lazy, Suspense, useDeferredValue, useEffect, useState } from "react";
import { useAuth, useUser } from "@clerk/react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";

import ProductCard from "../../features/menu/components/ProductCard";
import { defaultCakeMenuGroups, getImageFor, mergeCakeMenuGroups, mainCategoryOptions, cakeSubcategoryOptions } from "../../features/menu/data/menuData";
import useMenuCatalog from "../../features/menu/hooks/useMenuCatalog";
import "../../features/storefront/styles/storefront-panels.css";
import useCart from "../../features/cart/hooks/useCart";
import useWishlist from "../../features/wishlist/hooks/useWishlist";
import useCustomCakeBuilder, { flavourRates, shapeSurcharge } from "../../features/custom-cakes/hooks/useCustomCakeBuilder";
import { asset, responsiveImageSrcSet, rupees, whatsappOrderLink } from "../../utils/storefrontUtils";
import { apiUrl } from "../../utils/apiUrl";
import { policyPages } from "../PolicyPage";

const StorefrontPanels = lazy(() => import("../../features/storefront/components/StorefrontPanels"));
const AdminPanel = lazy(() => import("../../features/admin/components/AdminPanel"));

const categoryDefaults = [
  { id: "classic", label: "Classic Cakes", detail: "Black Forest Classic, White Forest, Vanilla Truffle", image: "", action: "classic" },
  { id: "chocolate", label: "Chocolate Cakes", detail: "Double Chocolate, Choco Chips, Choco Truffle, Choco Oreo Forest, Belgium Chocolate", image: "", action: "chocolate" },
  { id: "fruit", label: "Fruit Cakes", detail: "Pineapple, Mango, Strawberry, Blueberry, Black Currant", image: "", action: "fruit" },
  { id: "special", label: "Premium & Special Cakes", detail: "Rasmalai, Irish Coffee, Caramel Butterscotch, Dry Fruit, Mango Almond, Honey Almond", image: "", action: "special" },
  { id: "photo", label: "Photo Cakes", detail: "Photo cakes and custom designs", image: "", action: "photo" },
  { id: "desserts", label: "Desserts", detail: "Donuts, Choco Lava, Cup Cakes, Cake Pops, Brownies, Apple Pie", image: "", action: "desserts" },
];
const giftCategoryDefaults = [
  { id: "flowers", label: "Flowers", detail: "Fresh blooms for every celebration", image: "", action: "flowers" },
  { id: "chocolates", label: "Chocolates", detail: "Sweet gifts, ready to share", image: "", action: "chocolates" },
  { id: "accessories", label: "Cake Accessories", detail: "Birthday essentials and finishing touches", image: "", action: "accessories" },
  { id: "gift-hampers", label: "Gift Hampers", detail: "Curated celebration hampers, ready to gift", image: "", action: "gift-hampers" },
];
const categoryImageFallbacks = {
  classic: "9c4c74910c48.jpg",
  chocolate: "101920fbaa29.jpg",
  fruit: "2a95b9ea83e2.jpg",
  special: "2a95b9ea83e2.jpg",
  photo: "custom-cake-summary.jpg",
  desserts: "101920fbaa29.jpg",
};
const giftCategoryImageFallbacks = {
  flowers: "2a95b9ea83e2.jpg",
  chocolates: "101920fbaa29.jpg",
  accessories: "9c4c74910c48.jpg",
  "gift-hampers": "custom-cake-summary.jpg",
};
const defaultReviewHighlights = [
  { quote: "A wide choice of familiar flavours, with eggless and custom-design options when the occasion calls for something personal.", name: "Birthday cake order", place: "KR Puram, Bengaluru", rating: 5 },
  { quote: "From a half-kilo cake to a larger celebration centrepiece, it is easy to find the right size and flavour.", name: "Family celebration", place: "Bengaluru", rating: 5 },
  { quote: "Indian-inspired flavours such as Rasmalai sit alongside rich chocolate favourites for a menu with range.", name: "Flavour discovery", place: "KR Puram, Bengaluru", rating: 5 },
];
const fallbackOnImageError = (event, fallback) => {
  if (event.currentTarget.getAttribute("src") !== fallback) {
    event.currentTarget.src = fallback;
  }
};

function HomePage() {
  const { category: routeCategory } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { isLoaded: isAuthLoaded, isSignedIn, getToken } = useAuth();
  const [hero, setHero] = useState({ eyebrow: "Handcrafted with love", title: "Freshly Baked Cakes For Every Celebration", description: "Choose from our client-approved cake flavours, desserts, flowers and chocolates.", badge: "Starting from ₹350", image: "101920fbaa29.jpg", imageSecond: "9c4c74910c48.jpg", imageThird: "2a95b9ea83e2.jpg" });
  const [categories, setCategories] = useState(categoryDefaults);
  const [giftCategories, setGiftCategories] = useState(giftCategoryDefaults);
  const [cakeMenuGroups, setCakeMenuGroups] = useState(defaultCakeMenuGroups);
  const [giftsVisible, setGiftsVisible] = useState(true);
  const [occasionThemeDiscount, setOccasionThemeDiscount] = useState(10);
  const [customCakeSummaryImage, setCustomCakeSummaryImage] = useState("/images/custom-cake-summary.jpg");
  const [query, setQuery] = useState(() => new window.URLSearchParams(window.location.search).get("search") || "");
  const deferredQuery = useDeferredValue(query);
  const [focusedBrowseView, setFocusedBrowseView] = useState(() => {
    const params = new window.URLSearchParams(window.location.search);
    return window.location.pathname === "/custom-cake"
      ? "custom"
      : routeCategory || ["mainCategory", "cakeSubcategory", "occasion", "theme", "hasOccasionOrTheme", "minPrice", "maxPrice", "search", "sort", "available"].some((key) => params.has(key))
      ? "products"
      : window.location.hash === "#shop-by-occasion" ? "occasion" : "home";
  });
  const [showAllProducts, setShowAllProducts] = useState(() => {
    const params = new window.URLSearchParams(window.location.search);
    return Boolean(routeCategory) || ["mainCategory", "cakeSubcategory", "occasion", "theme", "hasOccasionOrTheme", "minPrice", "maxPrice", "search", "sort", "available"].some((key) => params.has(key));
  });
  const [page, setPage] = useState(() => Math.max(1, Number(new window.URLSearchParams(window.location.search).get("page")) || 1));
  const [catalogFilters, setCatalogFilters] = useState(() => {
    const params = new window.URLSearchParams(window.location.search);
    return {
      mainCategory: routeCategory || params.get("mainCategory") || "",
      cakeSubcategory: params.get("cakeSubcategory") || "",
      occasion: params.get("occasion") || "",
      theme: params.get("theme") || "",
      hasOccasionOrTheme: params.get("hasOccasionOrTheme") || "",
      minPrice: params.get("minPrice") || "",
      maxPrice: params.get("maxPrice") || "",
      sort: params.get("sort") || "name",
      available: params.get("available") || "",
    };
  });
  const [sectionVisibility, setSectionVisibility] = useState({ bestSellers: true, occasionTheme: true, addOns: true, reviews: true });
  const [reviewHighlights, setReviewHighlights] = useState(defaultReviewHighlights);
  const [featuredAddOns, setFeaturedAddOns] = useState(null);
  const isCustomCakePage = window.location.pathname === "/custom-cake";
  const [panel, setPanel] = useState("");
  const [dialog, setDialog] = useState("");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [customerCarePage, setCustomerCarePage] = useState("");
  const [canAccessAdmin, setCanAccessAdmin] = useState(false);
  const [reviewIndex, setReviewIndex] = useState(0);
  const isGiftCategoryActive = (id) => giftCategories.find((item) => item.id === id)?.active !== false;
  const showFlowersAndChocolates = ["flowers", "chocolates", "accessories", "gift-hampers"].some(isGiftCategoryActive);
  const isInitialBestSellers = !showAllProducts && !query && !Object.values(catalogFilters).some((value) => value && value !== "name");
  const activeFilters = {
    ...Object.fromEntries(Object.entries(catalogFilters).filter(([key, value]) => value && !(key === "sort" && value === "name"))),
    ...(isInitialBestSellers ? { featured: "true" } : {}),
    ...(deferredQuery.trim() ? { search: deferredQuery.trim() } : {}),
  };
  const catalogResult = useMenuCatalog({ filters: activeFilters, limit: showAllProducts ? 24 : 6, page });
  const addOnResult = useMenuCatalog({
    filters: { mainCategory: "flowers,chocolates,accessories,gift-hampers" },
    enabled: showFlowersAndChocolates,
    limit: 8,
  });
  const occasionProductsResult = useMenuCatalog({
    filters: { mainCategory: "cakes", hasOccasionOrTheme: "true", sort: "newest" },
    enabled: sectionVisibility.occasionTheme || focusedBrowseView === "occasion",
    limit: 4,
  });
  const visibleProducts = catalogResult.products;
  const addOnProducts = ["flowers", "chocolates", "accessories", "gift-hampers"].flatMap((category) => (
    isGiftCategoryActive(category) && (category !== "gift-hampers" || giftsVisible)
      ? featuredAddOns
        ? addOnResult.products.filter((product) => product.mainCategory === category && (featuredAddOns[category] || []).includes(product.id))
        : addOnResult.products.filter((product) => product.mainCategory === category).slice(0, 2)
      : []
  ));
  const themeNames = ["Theme"];
  const occasionPreviews = occasionProductsResult.products
    .filter((product) => product.occasionIds.length > 0 || product.themes.length > 0)
    .sort((first, second) => Date.parse(second.createdAt) - Date.parse(first.createdAt))
    .slice(0, 4)
    .map((product) => ({ product }));
  const {
    cart,
    cartCount,
    cartTotal,
    addToCart,
    updateCartQuantity,
    buildOrderCartLink,
  } = useCart();
  const { wishlist, setWishlist, wishlistCount, toggleWishlist } = useWishlist();
  const placeCartOrder = async (customer) => {
    const response = await fetch(apiUrl("/api/orders"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ customer, items: cart.map((item) => ({ productId: item.id, variantId: item.variantId, quantity: item.quantity })) }) });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.message || "Order could not be saved.");
    return { order: payload.data, whatsappUrl: buildOrderCartLink({ ...customer, orderId: payload.data.orderId }) };
  };
  const {
    builder,
    builderStep,
    builderStatus,
    estimate,
    advanceAmount,
    setBuilderStep,
    updateBuilderField,
    moveBuilderForward,
    submitBuilder,
  } = useCustomCakeBuilder();

  useEffect(() => {
    const params = new window.URLSearchParams(window.location.search);
    if (params.get("account") === "1") setPanel("account");
    if (params.get("cart") === "1") setPanel("cart");
    if (params.has("account") || params.has("cart")) {
      params.delete("account");
      params.delete("cart");
      navigate(`${location.pathname}${params.size ? `?${params}` : ""}${location.hash}`, { replace: true });
    }
  }, [location.hash, location.pathname, navigate]);

  useEffect(() => {
    if (location.pathname === "/custom-cake") {
      setFocusedBrowseView("custom");
      window.scrollTo({ top: 0, behavior: "auto" });
      return;
    }
    setFocusedBrowseView((current) => current === "custom" ? "home" : current);
  }, [location.pathname]);

  useEffect(() => {
    fetch(apiUrl("/api/site-settings")).then((response) => response.ok ? response.json() : null).then((payload) => {
      if (payload?.data?.hero) setHero((current) => ({
        ...current,
        ...payload.data.hero,
        // Older saved settings may contain an empty image value. Do not let
        // that hide the bundled photography used by the live homepage.
        image: payload.data.hero.image || current.image,
        imageSecond: payload.data.hero.imageSecond || current.imageSecond,
        imageThird: payload.data.hero.imageThird || current.imageThird,
      }));
      if (payload?.data?.customCakeSummaryImage) setCustomCakeSummaryImage(payload.data.customCakeSummaryImage);
      if (Array.isArray(payload?.data?.categories)) setCategories(categoryDefaults.map((fallback) => {
        const saved = payload.data.categories.find((item) => item.id === fallback.id || (fallback.id === "photo" && item.id === "custom")) || {};
        return { ...fallback, ...saved, id: fallback.id, action: saved.action === "custom" ? "photo" : (saved.action || fallback.action), image: saved.image || fallback.image };
      }));
      if (Array.isArray(payload?.data?.cakeMenuGroups)) setCakeMenuGroups(mergeCakeMenuGroups(payload.data.cakeMenuGroups));
      if (Array.isArray(payload?.data?.giftCategories)) setGiftCategories(giftCategoryDefaults.map((fallback) => ({
        ...fallback,
        ...(payload.data.giftCategories.find((item) => item.id === fallback.id) || {}),
      })));
      if (typeof payload?.data?.giftsVisible === "boolean") setGiftsVisible(payload.data.giftsVisible);
      if (payload?.data?.sectionVisibility) setSectionVisibility((current) => ({ ...current, ...payload.data.sectionVisibility }));
      if (Array.isArray(payload?.data?.reviewHighlights)) setReviewHighlights(payload.data.reviewHighlights.slice(0, 3));
      if (payload?.data?.featuredProducts) setFeaturedAddOns(payload.data.featuredProducts);
      if (Number.isInteger(payload?.data?.occasionThemeDiscount)) setOccasionThemeDiscount(payload.data.occasionThemeDiscount);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const params = new window.URLSearchParams();
    Object.entries(catalogFilters).forEach(([key, value]) => {
      if (value && !(key === "sort" && value === "name")) params.set(key, value);
    });
    if (query.trim()) params.set("search", query.trim());
    if (showAllProducts && page > 1) params.set("page", String(page));
    const next = `${location.pathname}${params.size ? `?${params}` : ""}${location.hash}`;
    if (next !== `${location.pathname}${location.search}${location.hash}`) navigate(next);
  }, [catalogFilters, location.hash, location.pathname, location.search, navigate, page, query, showAllProducts]);

  useEffect(() => {
    const params = new window.URLSearchParams(location.search);
    setQuery(params.get("search") || "");
    setPage(Math.max(1, Number(params.get("page")) || 1));
    setCatalogFilters({ mainCategory: routeCategory || params.get("mainCategory") || "", cakeSubcategory: params.get("cakeSubcategory") || "", occasion: params.get("occasion") || "", theme: params.get("theme") || "", hasOccasionOrTheme: params.get("hasOccasionOrTheme") || "", minPrice: params.get("minPrice") || "", maxPrice: params.get("maxPrice") || "", sort: params.get("sort") || "name", available: params.get("available") || "" });
    setShowAllProducts(Boolean(routeCategory) || ["mainCategory", "cakeSubcategory", "occasion", "theme", "hasOccasionOrTheme", "minPrice", "maxPrice", "search", "sort", "available"].some((key) => params.has(key)));
  }, [location.search, routeCategory]);

  useEffect(() => {
    if (!routeCategory || !giftCategories.some((item) => item.action === routeCategory)) return;
    setCatalogFilters((current) => ({ ...current, mainCategory: routeCategory }));
    setFocusedBrowseView("products");
    setShowAllProducts(true);
    const timer = window.setTimeout(() => document.getElementById("menu")?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
    return () => window.clearTimeout(timer);
  }, [routeCategory, giftCategories]);

  useEffect(() => {
    let active = true;
    async function checkAdminAccess() {
      if (!isAuthLoaded || !isSignedIn) return active && setCanAccessAdmin(false);
      try {
        const token = await getToken();
        const response = await fetch(apiUrl("/api/admin"), { headers: { Authorization: `Bearer ${token}` } });
        if (active) setCanAccessAdmin(response.ok);
      } catch { if (active) setCanAccessAdmin(false); }
    }
    checkAdminAccess();
    return () => { active = false; };
  }, [getToken, isAuthLoaded, isSignedIn]);

  const openMenuToFilter = (filter) => {
    if (filter.kind === "custom") {
      setFocusedBrowseView("custom");
      setMobileNavOpen(false);
      navigate("/custom-cake");
      return;
    }
    setFocusedBrowseView("products");
    const field = {
      category: "mainCategory",
      subcategory: "cakeSubcategory",
      occasion: "occasion",
      theme: "theme",
    }[filter.kind];
    if (filter.kind === "all" || filter.kind === "bestseller") {
      setCatalogFilters({ mainCategory: "", cakeSubcategory: "", occasion: "", theme: "", hasOccasionOrTheme: "", minPrice: "", maxPrice: "", sort: "name", available: "" });
      setQuery("");
    } else if (field) {
      setCatalogFilters((current) => ({
        ...current,
        ...(field === "cakeSubcategory" || field === "occasion" || field === "theme" ? { mainCategory: "cakes" } : {}),
        hasOccasionOrTheme: "",
        [field]: filter.value,
      }));
    }
    setShowAllProducts(filter.kind !== "bestseller");
    setPage(1);
    setMobileNavOpen(false);
    if (routeCategory) navigate("/", { replace: true });
    window.setTimeout(() => document.getElementById("menu")?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
  };

  const scrollToSection = (sectionId) => {
    setMobileNavOpen(false);
    if (sectionId === "shop-by-occasion") {
      setFocusedBrowseView("occasion");
      setCatalogFilters({ mainCategory: "", cakeSubcategory: "", occasion: "", theme: "", hasOccasionOrTheme: "", minPrice: "", maxPrice: "", sort: "name", available: "" });
      setQuery("");
      setShowAllProducts(false);
      if (routeCategory) navigate("/", { replace: true });
      navigate(`${location.pathname}${location.search}#${sectionId}`);
      window.setTimeout(() => document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
      return;
    }
    document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const browseAllCakes = () => {
    setFocusedBrowseView("products");
    setCatalogFilters((current) => ({ ...current, mainCategory: "cakes", cakeSubcategory: "", hasOccasionOrTheme: "" }));
    setShowAllProducts(true);
    setPage(1);
    if (routeCategory) navigate("/", { replace: true });
    window.setTimeout(() => document.getElementById("menu")?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
  };

  const browseAllOccasionThemeCakes = () => {
    setFocusedBrowseView("products");
    setCatalogFilters({
      mainCategory: "cakes",
      cakeSubcategory: "",
      occasion: "",
      theme: "",
      hasOccasionOrTheme: "true",
      minPrice: "",
      maxPrice: "",
      sort: "name",
      available: "",
    });
    setQuery("");
    setShowAllProducts(true);
    setPage(1);
    if (routeCategory) navigate("/", { replace: true });
    window.setTimeout(() => document.getElementById("menu")?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
  };

  const browseAllAddOns = () => {
    setFocusedBrowseView("products");
    setCatalogFilters((current) => ({
      ...current,
      mainCategory: "flowers,chocolates,accessories,gift-hampers",
      cakeSubcategory: "",
      occasion: "",
      theme: "",
      hasOccasionOrTheme: "",
    }));
    setQuery("");
    setShowAllProducts(true);
    setPage(1);
    if (routeCategory) navigate("/", { replace: true });
    window.setTimeout(() => document.getElementById("menu")?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
  };

  const selectCakeMenuItem = (item) => {
    if (item.action === "custom") {
      setFocusedBrowseView("custom");
      setMobileNavOpen(false);
      navigate("/custom-cake");
      return;
    }
    openMenuToFilter({ kind: "subcategory", value: item.action, label: item.label });
  };

  const renderCakeMenuGroups = () => (
    <div className="cakes-dropdown-groups">
      {cakeMenuGroups.map((group) => (
        <section className="cakes-dropdown-group" key={group.id}>
          <h3>{group.title}</h3>
          {group.items.map((item) => (
            <button key={item.id} type="button" onClick={() => selectCakeMenuItem(item)}>{item.label}</button>
          ))}
        </section>
      ))}
    </div>
  );
  const renderProductCards = (products, prefix) => (
    <div className="menu-grid">
      {products.length ? products.map((product) => (
        <ProductCard key={`${prefix}-${product.id}`} product={product} wishlist={wishlist} cart={cart} toggleWishlist={toggleWishlist} addToCart={addToCart} openCart={() => setPanel("cart")} />
      )) : <div className="empty-menu">No products in this collection yet.</div>}
    </div>
  );
  const renderAddOnSection = () => (
    <section className="add-ons-section section" id="flowers-chocolates" aria-labelledby="flowersChocolatesTitle">
      <div className="container">
        <div className="section-head"><div><p className="eyebrow">Thoughtful finishing touches</p><h2 id="flowersChocolatesTitle">Flowers, Chocolates &amp; Gifts</h2></div><button type="button" className="mobile-section-view-all" onClick={browseAllAddOns}>View All <span aria-hidden="true">→</span></button><p className="lede">Fresh blooms, sweet gifts and celebration essentials.</p></div>
        <div className="add-on-filter-row"><div className="occasion-links add-on-category-links">{giftCategories.filter((category) => isGiftCategoryActive(category.id) && (category.id !== "gift-hampers" || giftsVisible)).map((category) => <button className="btn btn-secondary" type="button" key={category.id} onClick={() => openMenuToFilter({ kind: "category", value: category.action, label: category.label })}>{category.label}</button>)}</div><button className="browse-all-cakes add-on-view-all" type="button" onClick={browseAllAddOns}>View All <span aria-hidden="true">→</span></button></div>
        {addOnProducts.length > 0 && renderProductCards(addOnProducts.slice(0, 8), "add-on")}
        {!addOnProducts.length && <div className="empty-menu" role={addOnResult.loading ? "status" : undefined}>{addOnResult.loading ? "Loading featured products…" : "Featured products will appear here when available."}</div>}
      </div>
    </section>
  );

  const dialogContent = {
    "How to Order": {
      title: "How to order",
      body: "Choose a menu cake and continue on WhatsApp, or use the Custom Cake Builder for a personalised celebration cake. The bakery confirms final price and availability before production begins.",
    },
    "Delivery & Pickup": {
      title: "Delivery & pickup",
      body: "Darby's Pastries delivers in nearby KR Puram areas. Please confirm date, time and address so the bakery can check stock and final pricing before ordering.",
    },
    FAQ: {
      title: "FAQ",
      body: "Same-day delivery is available in selected locations. Eggless, photo and flowers/chocolates can be ordered directly on WhatsApp with final confirmation from the bakery.",
    },
    "Privacy Policy": {
      title: "Privacy Policy",
      body: "This preview only stores cart and wishlist data in memory for the browser session and does not add any database, account or payment system.",
    },
    "Terms & Conditions": {
      title: "Terms & Conditions",
      body: "All orders are subject to final bakery confirmation on WhatsApp. Final pricing, ingredient availability and access timings remain subject to confirmation by Darby's Pastries.",
    },
  };

  return (
    <div className="react-storefront-preview">
      <header className="site-nav">
        <div className={`container header-main ${mobileNavOpen ? "menu-open" : ""}`}>
          <button className="menu-toggle" type="button" aria-label="Open navigation menu" aria-expanded={mobileNavOpen} onClick={() => setMobileNavOpen((value) => !value)}>
            <span />
            <span />
            <span />
          </button>

          <a className="brand-link" href="/" aria-label="Darby's Pastries home" onClick={() => setMobileNavOpen(false)}>
            <img className="brand-logo" src={asset("darby-logo.webp")} alt="Darby's Pastries logo" loading="eager" decoding="async" />
            <span className="brand-wordmark">
              <span className="brand-name">DARBY'S</span>
              <span className="brand-type">PASTRIES</span>
            </span>
          </a>

          <a className="delivery-meta" href="#footer-contact">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" stroke="currentColor" strokeWidth="2"/><circle cx="12" cy="10" r="2.5" stroke="currentColor" strokeWidth="2"/></svg>
            <span>📍</span>
            <span>
              <strong>Delivering in KR Puram</strong>
              <span>Open daily, 10 AM–9 PM</span>
            </span>
          </a>

          <label className="header-search">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2"/><path d="m16 16 4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
            <span>⌕</span>
            <input type="search" value={query} onChange={(event) => {
              const nextQuery = event.target.value;
              setQuery(nextQuery);
              if (nextQuery.trim()) {
                setFocusedBrowseView("products");
                setShowAllProducts(true);
              }
              setPage(1);
            }} placeholder="Search by product name" aria-label="Search by product name" />
          </label>

          <div className="quick-links" aria-label="Quick actions">
            {canAccessAdmin && <button className="quick-link admin-link" type="button" onClick={() => setAdminOpen(true)} aria-haspopup="dialog">
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="4" y="5" width="16" height="15" rx="2" stroke="currentColor" strokeWidth="2"/><path d="M8 5V3m8 2V3M8 10h8M8 14h3m2 0h3M8 17h3m2 0h3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
              <span>Admin</span>
            </button>}
            <button className="quick-link" type="button" onClick={() => setPanel("wishlist")}>
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M20.8 4.7a5.5 5.5 0 0 0-7.8 0L12 5.8l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.5a5.5 5.5 0 0 0 0-7.8Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              ♡
              <span>Wishlist</span>
              {wishlistCount ? <b className="cart-badge">{wishlistCount}</b> : null}
            </button>
            <button className="quick-link" type="button" onClick={() => setPanel("cart")}>
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3 4h2l2.1 10.1a2 2 0 0 0 2 1.6h7.8a2 2 0 0 0 2-1.6L20 8H6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><circle cx="10" cy="20" r="1.4" fill="currentColor"/><circle cx="17" cy="20" r="1.4" fill="currentColor"/></svg>
              🛒
              <span>Cart</span>
              {cartCount ? <b className="cart-badge">{cartCount}</b> : null}
            </button>
            <AccountQuickAction onOpenAccount={() => setPanel("account")} />
          </div>
        </div>

        <div className="nav-bar">
          <div className="container nav-inner">
            <div className={`mobile-nav-backdrop ${mobileNavOpen ? "open" : ""}`} onClick={() => setMobileNavOpen(false)} aria-hidden="true" />
            <nav className={`nav-links ${mobileNavOpen ? "open" : ""}`} aria-label="Main navigation">
              <div className="mobile-drawer-head"><strong>Browse Darby's</strong><button className="mobile-drawer-close" type="button" onClick={() => setMobileNavOpen(false)} aria-label="Close navigation menu">×</button></div>
              <div className="nav-item"><a className="nav-link" href="/" onClick={() => setMobileNavOpen(false)}>Home</a></div>
              <div className="nav-item"><button type="button" className="nav-link" onClick={() => scrollToSection("shop-by-occasion")}>Shop by Occasion</button></div>
              <div className="nav-item cakes-nav"><button type="button" className="nav-link">Cakes <span aria-hidden="true">⌄</span></button><div className="cakes-dropdown">{renderCakeMenuGroups()}</div></div>
              {giftCategories.map((item) => <div className="nav-item" key={item.id}><Link className="nav-link" to={`/category/${item.action}`} onClick={() => setMobileNavOpen(false)}>{item.label}</Link></div>)}
              <div className="nav-item"><button type="button" className="nav-link" onClick={() => openMenuToFilter({ kind: "bestseller", label: "Best Sellers" })}>Best Sellers</button></div>
              <div className="nav-item"><a className="nav-link" href="#footer-contact" onClick={() => setMobileNavOpen(false)}>Contact</a></div>
            </nav>
            <nav className="legacy-desktop-nav" aria-label="Main navigation">
              <a href="/">Home</a>
              <button type="button" onClick={() => scrollToSection("shop-by-occasion")}>Shop by Occasion</button>
              <div className="cakes-nav"><button type="button">Cakes <span aria-hidden="true">⌄</span></button><div className="cakes-dropdown">{renderCakeMenuGroups()}</div></div>
              {giftCategories.map((item) => <Link key={item.id} to={`/category/${item.action}`}>{item.label}</Link>)}
              <button type="button" onClick={() => openMenuToFilter({ kind: "bestseller", label: "Best Sellers" })}>Best Sellers</button>
              <a href="#footer-contact">Contact</a>
            </nav>
          </div>
        </div>
      </header>

      {customerCarePage && <CustomerCareCard slug={customerCarePage} onClose={() => setCustomerCarePage("")} />}

      <main>
        {focusedBrowseView === "home" && <section className="hero" id="home">
          <div className="container hero-grid">
            <div className="hero-copy">
              <p className="eyebrow">{hero.eyebrow}</p>
              <h1>{hero.title}</h1>
              <p className="lede">{hero.description}</p>
              <div className="hero-actions">
                <a className="btn btn-primary" href="#menu">Order Now</a>
                <a className="btn btn-secondary" href="https://wa.me/919835888631?text=Hello%20Darby%27s%20Pastries%2C%20I%27d%20like%20to%20order%20a%20cake." target="_blank" rel="noreferrer">Order on WhatsApp</a>
              </div>
              <div className="hero-notes"><span>Same Day Delivery</span><span>Freshly Baked Daily</span><span>Eggless Options</span><span>Custom Designs</span><span>4.8 Rating</span></div>
            </div>
            <div className="hero-media">
              <div className="hero-gallery">
                <figure className="hero-tile hero-tile-main"><img className="hero-photo" src={asset(hero.image)} srcSet={responsiveImageSrcSet(asset(hero.image))} sizes="(max-width: 900px) 100vw, 50vw" alt="Rich chocolate celebration cake" loading="eager" decoding="async" fetchPriority="high" /><figcaption>Chocolate Celebration Cake</figcaption></figure>
                <figure className="hero-tile hero-tile-small"><img className="hero-photo" src={asset(hero.imageSecond)} srcSet={responsiveImageSrcSet(asset(hero.imageSecond))} sizes="(max-width: 900px) 45vw, 20vw" alt="Black Forest birthday cake" loading="eager" decoding="async" /><figcaption>Birthday Cake</figcaption></figure>
                <figure className="hero-tile hero-tile-small"><img className="hero-photo" src={asset(hero.imageThird)} srcSet={responsiveImageSrcSet(asset(hero.imageThird))} sizes="(max-width: 900px) 45vw, 20vw" alt="Designer cake" loading="eager" decoding="async" /><figcaption>Designer Cake</figcaption></figure>
              </div>
              <button className="hero-badge" type="button" onClick={browseAllCakes} aria-label="Browse cakes starting from 350 rupees">Starting from ₹350 <span aria-hidden="true">→</span></button>
            </div>
          </div>
        </section>}

        {focusedBrowseView === "home" && <section className="category-section" aria-labelledby="categoryTitle">
          <div className="container">
            <div className="section-head"><div><p className="eyebrow">Made for every moment</p><h2 id="categoryTitle">Shop By Category</h2></div><p className="lede">Find the perfect cake for every celebration.</p></div>
            <div className="category-grid">
              {categories.map((category) => (
                <button key={category.id} className="category-card" type="button" onClick={() => openMenuToFilter({ kind: "subcategory", value: category.action || "classic", label: category.label })}>
                  <img src={asset(category.image || categoryImageFallbacks[category.id] || "101920fbaa29.jpg")} onError={(event) => fallbackOnImageError(event, asset(categoryImageFallbacks[category.id] || "101920fbaa29.jpg"))} alt={category.label} loading="lazy" decoding="async" />
                  <span className="category-card-body"><h3>{category.label}</h3></span>
                </button>
              ))}
            </div>
          </div>
        </section>}

        {((focusedBrowseView === "home" && sectionVisibility.bestSellers) || focusedBrowseView === "products") && <section className="menu-section section" id="menu">
          <div className="container">
            <div className="section-head featured-section-head">
              <div><p className="eyebrow">Customer favourites</p><h2>{isInitialBestSellers ? "Best Sellers" : query ? "Search Results" : "Shop Products"}</h2></div>
              <div className="featured-section-actions">
                <p className="lede">{isInitialBestSellers ? "Choose a weight and order directly on WhatsApp." : `${catalogResult.pagination.total} products found`}</p>
                {!showAllProducts ? <button type="button" className="browse-all-cakes" onClick={() => { setFocusedBrowseView("products"); setCatalogFilters({ mainCategory: "", cakeSubcategory: "", occasion: "", theme: "", hasOccasionOrTheme: "", minPrice: "", maxPrice: "", sort: "name", available: "" }); setShowAllProducts(true); setPage(1); }}>View All <span aria-hidden="true">→</span></button> : <button type="button" className="browse-all-cakes" onClick={browseAllCakes}>Browse All Cakes <span aria-hidden="true">→</span></button>}
              </div>
            </div>
            {showAllProducts && <div className="catalog-filter-toolbar" aria-label="Product sorting">
              <label>Sort products<select value={catalogFilters.sort} onChange={(event) => { setCatalogFilters((current) => ({ ...current, sort: event.target.value })); setPage(1); }}><option value="name">Featured</option><option value="price-asc">Price: Low to High</option><option value="price-desc">Price: High to Low</option></select></label>
            </div>}
            {catalogResult.error && <p className="empty-menu" role="alert">{catalogResult.error}</p>}
            {catalogResult.loading && <p className="empty-menu" role="status">Loading products…</p>}
            <div className="menu-grid">
              {visibleProducts.length ? (
                visibleProducts.map((product) => (
                  <ProductCard key={product.id} product={product} discountPercent={(catalogFilters.occasion || catalogFilters.theme || catalogFilters.hasOccasionOrTheme) ? occasionThemeDiscount : 0} wishlist={wishlist} cart={cart} toggleWishlist={toggleWishlist} addToCart={addToCart} openCart={() => setPanel("cart")} />
                ))
              ) : (
                !catalogResult.loading && <div className="empty-menu">No matching products found. Try another search or category.</div>
              )}
            </div>
            {showAllProducts && catalogResult.pagination.pages > 1 && <div className="admin-pagination" aria-label="Product pages"><button type="button" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>Previous</button><span>Page {page} of {catalogResult.pagination.pages}</span><button type="button" disabled={page >= catalogResult.pagination.pages} onClick={() => setPage((current) => current + 1)}>Next</button></div>}
          </div>
        </section>}

        {((focusedBrowseView === "home" && sectionVisibility.occasionTheme) || focusedBrowseView === "occasion") && <section className="occasion-section section" id="shop-by-occasion" aria-labelledby="occasionTitle">
          <div className="container">
            <div className="section-head"><div><p className="eyebrow">Celebrate every moment</p><h2 id="occasionTitle">Shop by Occasion{themeNames.length > 0 ? " & Theme" : ""}</h2></div><p className="lede">Find cakes made for the moments and themes that matter.</p><button type="button" className="mobile-section-view-all" onClick={browseAllOccasionThemeCakes}>View All <span aria-hidden="true">→</span></button></div>
            <div className="occasion-discovery">
              {occasionPreviews.length > 0 && <div className="occasion-preview-group">
                <div className="occasion-preview-heading"><h3>Popular occasion cakes</h3></div>
                <div className="menu-grid">{occasionPreviews.map(({ product }) => <ProductCard key={`occasion-${product.id}`} product={product} discountPercent={occasionThemeDiscount} wishlist={wishlist} cart={cart} toggleWishlist={toggleWishlist} addToCart={addToCart} openCart={() => setPanel("cart")} />)}</div>
              </div>}
            </div>
          </div>
        </section>}

        {sectionVisibility.addOns && focusedBrowseView !== "custom" && renderAddOnSection()}

        {(isCustomCakePage || focusedBrowseView === "home") && <section className="custom-banner" id="custom">
          <div className="container">
            <div className="custom-builder-head"><div><p className="eyebrow">Build it your way</p><h2>Custom Cake Builder</h2></div><div className="custom-builder-meta"><p className="lede">Choose every detail, see the estimate update instantly, then send one complete order request on WhatsApp.</p></div></div>
            {builder.legacyBuilder === true ? (<form className="custom-builder-shell" onSubmit={submitBuilder} noValidate>
              <div className="custom-builder-main">
                <div className="custom-progress" aria-label="Custom cake order progress">
                  {["Occasion", "Cake", "Design", "Delivery", "Advance"].map((name, index) => (
                    <button key={name} type="button" className={`custom-progress-step ${builderStep === index ? "active" : ""}`} onClick={() => setBuilderStep(index)}>
                      <span className="step-index">{index + 1}</span>
                      <span className="step-label">{name}</span>
                    </button>
                  ))}
                </div>

                {builderStep === 0 && (
                  <section className="builder-panel">
                    <h3>What are you celebrating?</h3>
                    <div className="choice-grid">{["Birthday", "Anniversary", "Wedding", "Baby Shower", "Photo Cake", "Corporate", "Other"].map((option) => <label key={option} className="choice-card"><input type="radio" name="occasion" value={option} checked={builder.occasion === option} onChange={(event) => updateBuilderField("occasion", event.target.value)} /><span>{option}</span></label>)}</div>
                    <div className="builder-field" style={{ marginTop: 16 }}><label htmlFor="customTheme">Theme / colour palette</label><input id="customTheme" value={builder.theme} onChange={(event) => updateBuilderField("theme", event.target.value)} placeholder="e.g. Cricket theme in red and white" maxLength={120} /></div>
                  </section>
                )}

                {builderStep === 1 && (
                  <section className="builder-panel">
                    <h3>Choose the cake</h3>
                    <div className="builder-form-grid">
                      <div className="builder-field"><label htmlFor="customFlavour">Flavour</label><select id="customFlavour" value={builder.flavour} onChange={(event) => updateBuilderField("flavour", event.target.value)}>{Object.keys(flavourRates).map((flavour) => <option key={flavour} value={flavour}>{flavour} · ₹{flavourRates[flavour]}/kg</option>)}</select></div>
                      <div className="builder-field"><label htmlFor="customWeight">Weight</label><select id="customWeight" value={builder.weight} onChange={(event) => updateBuilderField("weight", Number(event.target.value))}>{[0.5, 1, 1.5, 2, 3, 5].map((weight) => <option key={weight} value={weight}>{weight} kg</option>)}</select></div>
                      <div className="builder-field full"><span className="builder-group-label">Shape</span><div className="choice-grid">{Object.keys(shapeSurcharge).map((shape) => <label key={shape} className="choice-card"><input type="radio" name="shape" value={shape} checked={builder.shape === shape} onChange={(event) => updateBuilderField("shape", event.target.value)} /><span>{shape}{shape === "Round" ? "" : ` · +₹${shapeSurcharge[shape]}`}</span></label>)}</div></div>
                    </div>
                  </section>
                )}

                {builderStep === 2 && (
                  <section className="builder-panel">
                    <h3>Personalise the design</h3>
                    <div className="builder-option-list">
                      <label className="builder-check"><input type="checkbox" checked={builder.eggless} onChange={(event) => updateBuilderField("eggless", event.target.checked)} /><span><strong>Eggless preparation · +₹50</strong><small>Available across all listed flavours.</small></span></label>
                      <label className="builder-check"><input type="checkbox" checked={builder.fondant} onChange={(event) => updateBuilderField("fondant", event.target.checked)} /><span><strong>Fondant finish · +₹150/kg</strong><small>Calculated from your selected cake weight.</small></span></label>
                      <label className="builder-check"><input type="checkbox" checked={builder.designCutting} onChange={(event) => updateBuilderField("designCutting", event.target.checked)} /><span><strong>Detailed design cutting · +20%</strong><small>Applied after flavour, size, shape, eggless and fondant charges.</small></span></label>
                    </div>
                    <div className="builder-addon-group"><span className="builder-group-label">Party Add-ons</span><div className="builder-addon-list"><label className="builder-check"><input type="checkbox" checked={builder.candleSet} onChange={(event) => updateBuilderField("candleSet", event.target.checked)} /><span><strong>Standard Candle Set (+₹20)</strong></span></label><label className="builder-check"><input type="checkbox" checked={builder.cakeKnife} onChange={(event) => updateBuilderField("cakeKnife", event.target.checked)} /><span><strong>Cake Cutting Knife (+₹10)</strong></span></label><label className="builder-check"><input type="checkbox" checked={builder.sparkler} onChange={(event) => updateBuilderField("sparkler", event.target.checked)} /><span><strong>Sparkler Candle (+₹30)</strong></span></label></div></div>
                    <div className="builder-form-grid" style={{ marginTop: 16 }}><div className="builder-field full"><label htmlFor="customMessage">Message on cake</label><input id="customMessage" value={builder.cakeMessage} onChange={(event) => updateBuilderField("cakeMessage", event.target.value)} placeholder="e.g. Happy Birthday Aarav" maxLength={60} /></div></div>
                  </section>
                )}

                {builderStep === 3 && (
                  <section className="builder-panel">
                    <h3>Delivery & customer details</h3>
                    <div className="builder-form-grid">
                      <div className="builder-field"><label htmlFor="customDeliveryDate">Delivery date</label><input id="customDeliveryDate" type="date" value={builder.deliveryDate} onChange={(event) => updateBuilderField("deliveryDate", event.target.value)} /></div>
                      <div className="builder-field"><label htmlFor="customDeliveryTime">Delivery time slot</label><select id="customDeliveryTime" value={builder.deliveryTime} onChange={(event) => updateBuilderField("deliveryTime", event.target.value)}><option value="">Select a time slot</option><option value="Morning (9 AM - 12 PM)">Morning (9 AM - 12 PM)</option><option value="Afternoon (12 PM - 4 PM)">Afternoon (12 PM - 4 PM)</option><option value="Evening (4 PM - 8 PM)">Evening (4 PM - 8 PM)</option></select></div>
                      <div className="builder-field"><label htmlFor="customCustomerName">Customer name</label><input id="customCustomerName" value={builder.customerName} onChange={(event) => updateBuilderField("customerName", event.target.value)} /></div>
                      <div className="builder-field"><label htmlFor="customPhone">Phone number</label><input id="customPhone" value={builder.phone} onChange={(event) => updateBuilderField("phone", event.target.value)} type="tel" placeholder="10-digit mobile number" /></div>
                      <div className="builder-field full"><label htmlFor="customAlternatePhone">Alternate phone number</label><input id="customAlternatePhone" value={builder.alternatePhone} onChange={(event) => updateBuilderField("alternatePhone", event.target.value)} type="tel" placeholder="Another number we can reach" /></div>
                      <div className="builder-field full"><label htmlFor="customAddress">Delivery address</label><textarea id="customAddress" value={builder.address} onChange={(event) => updateBuilderField("address", event.target.value)} placeholder="House / flat, street and area" /></div>
                      <div className="builder-field full"><label htmlFor="customLandmarkPincode">Landmark / Pincode</label><input id="customLandmarkPincode" value={builder.landmarkPincode} onChange={(event) => updateBuilderField("landmarkPincode", event.target.value)} placeholder="Nearby landmark / pincode" /></div>
                    </div>
                  </section>
                )}

                {builderStep === 4 && (
                  <section className="builder-panel">
                    <h3>Advance payment & review</h3>
                    <div className="builder-payment"><div className="payment-summary"><span>50% advance due</span><strong>{rupees(advanceAmount)}</strong><small>Remaining amount is confirmed with the final order.</small></div><div className="upi-box"><span>Pay via UPI</span><div className="upi-id-row"><code>dummy-upi@darbys</code></div><span className="upi-placeholder">Placeholder · do not pay yet</span><p className="upi-warning">This is not an active payment ID. Darby's will replace it with the real UPI ID before accepting advance payments.</p></div></div>
                    <label className="builder-check" style={{ marginTop: 14 }}><input type="checkbox" checked={builder.detailsConfirm} onChange={(event) => updateBuilderField("detailsConfirm", event.target.checked)} /><span><strong>I have reviewed these order details</strong><small>The bakery will confirm final design, delivery charge and payment status on WhatsApp.</small></span></label>
                  </section>
                )}

                <div className="builder-actions">
                  <button type="button" className="btn btn-secondary builder-back" onClick={() => setBuilderStep((value) => Math.max(0, value - 1))} hidden={builderStep === 0}>Back</button>
                  <div className="builder-actions-right">{builderStep < 4 ? <button type="button" className="btn btn-primary builder-next" onClick={moveBuilderForward}>Continue</button> : <button type="submit" className="btn btn-primary builder-submit">Send order on WhatsApp ↗</button>}</div>
                </div>
                <p className="builder-status" role="status" aria-live="polite">{builderStatus}</p>
              </div>
              <aside className="builder-summary" aria-label="Live custom cake price estimate">
                <div className="builder-summary-sticky"><p className="builder-summary-kicker">Live price estimate</p><h3>Your custom cake</h3><div className="builder-price"><span>Estimated total</span><strong>{rupees(estimate)}</strong></div><dl className="builder-breakdown"><div><dt>Occasion</dt><dd>{builder.occasion}</dd></div><div><dt>Flavour</dt><dd>{builder.flavour}</dd></div><div><dt>Weight</dt><dd>{builder.weight} kg</dd></div><div><dt>Shape</dt><dd>{builder.shape}</dd></div><div><dt>Eggless</dt><dd>{builder.eggless ? "Yes" : "No"}</dd></div><div><dt>Fondant</dt><dd>{builder.fondant ? "Yes" : "No"}</dd></div><div><dt>Design cutting</dt><dd>{builder.designCutting ? "Yes" : "No"}</dd></div><div><dt>Party add-ons</dt><dd>{builder.candleSet || builder.cakeKnife || builder.sparkler ? "Selected" : "None"}</dd></div></dl><div className="advance-strip"><span>50% advance</span><strong>{rupees(advanceAmount)}</strong></div><p className="estimate-note">This is an estimate; final price and delivery charge are confirmed by Darby's on WhatsApp.</p></div>
              </aside>
            </form>) : (<form className="custom-builder-shell custom-cake-simple-form" onSubmit={submitBuilder} noValidate>
              <div className="custom-builder-main">
                <section className="builder-panel"><h3>Cake details</h3><div className="builder-form-grid">
                  <div className="builder-field"><label htmlFor="customOccasion">Occasion</label><select id="customOccasion" value={builder.occasion} onChange={(e) => updateBuilderField("occasion", e.target.value)}>{["Birthday", "Anniversary", "Wedding", "Baby Shower", "Corporate", "Other"].map((v) => <option key={v}>{v}</option>)}</select></div>
                  <div className="builder-field"><label htmlFor="customFlavour">Flavour</label><select id="customFlavour" value={builder.flavour} onChange={(e) => updateBuilderField("flavour", e.target.value)}>{Object.keys(flavourRates).map((v) => <option key={v}>{v}</option>)}</select></div>
                  <div className="builder-field"><label htmlFor="customWeight">Weight</label><select id="customWeight" value={builder.weight} onChange={(e) => updateBuilderField("weight", Number(e.target.value))}>{[0.5, 1, 1.5, 2].map((v) => <option key={v} value={v}>{v === 0.5 ? "500 g" : `${v} kg`}</option>)}</select></div>
                  <div className="builder-field"><label htmlFor="customEgg">Egg preference</label><select id="customEgg" value={builder.eggPreference} onChange={(e) => updateBuilderField("eggPreference", e.target.value)}><option>Egg</option><option>Eggless</option></select></div>
                  <div className="builder-field"><label htmlFor="customShape">Shape</label><select id="customShape" value={builder.shape} onChange={(e) => updateBuilderField("shape", e.target.value)}>{Object.keys(shapeSurcharge).map((v) => <option key={v}>{v}</option>)}</select></div>
                  <div className="builder-field"><label htmlFor="customMessage">Message on cake <small>(optional)</small></label><input id="customMessage" value={builder.cakeMessage} onChange={(e) => updateBuilderField("cakeMessage", e.target.value)} placeholder="e.g. Happy Birthday Aarav" maxLength={60} /></div>
                </div></section>
                <section className="builder-panel"><h3>Delivery details</h3><div className="builder-form-grid">
                  <div className="builder-field"><label htmlFor="customDeliveryType">Delivery type</label><select id="customDeliveryType" value={builder.deliveryType} onChange={(e) => updateBuilderField("deliveryType", e.target.value)}><option>Home Delivery</option><option>Store Pickup</option></select></div>
                  <div className="builder-field"><label htmlFor="customDeliveryDate">Delivery date</label><input id="customDeliveryDate" type="date" min={new Date().toISOString().slice(0, 10)} value={builder.deliveryDate} onChange={(e) => updateBuilderField("deliveryDate", e.target.value)} /></div>
                  {builder.deliveryType === "Home Delivery" && <><div className="builder-field"><label htmlFor="customDeliveryTime">Delivery time slot</label><select id="customDeliveryTime" value={builder.deliveryTime} onChange={(e) => updateBuilderField("deliveryTime", e.target.value)}><option value="">Select a time slot</option><option>Morning (9 AM - 12 PM)</option><option>Afternoon (12 PM - 4 PM)</option><option>Evening (4 PM - 8 PM)</option></select></div>
                  <div className="builder-field"><label htmlFor="customPincode">Pincode</label><input id="customPincode" value={builder.pincode} onChange={(e) => updateBuilderField("pincode", e.target.value)} inputMode="numeric" maxLength={6} /></div></>}
                  {builder.deliveryType === "Home Delivery" && <div className="builder-field full"><label htmlFor="customAddress">Full delivery address</label><textarea id="customAddress" value={builder.address} onChange={(e) => updateBuilderField("address", e.target.value)} placeholder="House / flat, street and area" /></div>}
                </div></section>
                <section className="builder-panel"><h3>Customer details</h3><div className="builder-form-grid"><div className="builder-field"><label htmlFor="customCustomerName">Customer name</label><input id="customCustomerName" value={builder.customerName} onChange={(e) => updateBuilderField("customerName", e.target.value)} /></div><div className="builder-field"><label htmlFor="customPhone">WhatsApp / mobile number</label><input id="customPhone" value={builder.phone} onChange={(e) => updateBuilderField("phone", e.target.value)} type="tel" inputMode="tel" placeholder="10-digit mobile number" /></div></div></section>
                <div className="builder-actions"><button type="submit" className="btn btn-primary builder-submit">Send order on WhatsApp →</button></div><p className="builder-status" role="status" aria-live="polite">{builderStatus}</p>
              </div>
              <aside className="builder-summary" aria-label="Live custom cake price estimate"><div className="builder-summary-sticky"><p className="builder-summary-kicker">Order summary</p><h3>Your cake summary</h3><img className="custom-summary-cake-image" src={asset(customCakeSummaryImage)} alt="Pink strawberry celebration cake" /><div className="builder-price"><span>Estimated total</span><strong>{rupees(estimate)}</strong></div><dl className="builder-breakdown"><div><dt>Occasion</dt><dd>{builder.occasion}</dd></div><div><dt>Flavour</dt><dd>{builder.flavour}</dd></div><div><dt>Weight</dt><dd>{builder.weight === 0.5 ? "500 g" : `${builder.weight} kg`}</dd></div><div><dt>Egg preference</dt><dd>{builder.eggPreference}</dd></div><div><dt>Shape</dt><dd>{builder.shape}</dd></div>{builder.cakeMessage && <div><dt>Message</dt><dd>{builder.cakeMessage}</dd></div>}<div><dt>Delivery</dt><dd>{builder.deliveryType}</dd></div>{builder.deliveryTime && <div><dt>Time</dt><dd>{builder.deliveryDate} · {builder.deliveryTime}</dd></div>}<div><dt>Customer</dt><dd>{builder.customerName || "—"}</dd></div></dl><div className="advance-strip"><span>Estimated 50% advance</span><strong>{rupees(advanceAmount)}</strong></div><p className="estimate-note">Final price and delivery charges will be confirmed by Darby's Pastries.</p></div></aside>
              <div className="builder-actions mobile-builder-submit"><button type="submit" className="btn btn-primary builder-submit">Send order on WhatsApp →</button></div>
            </form>)}
          </div>
        </section>}
        {sectionVisibility.addOns && focusedBrowseView === "custom" && renderAddOnSection()}

        {focusedBrowseView === "home" && sectionVisibility.reviews && <section className="reviews-section" id="reviews"><div className="container">
          <div className="section-head"><div><p className="eyebrow">Celebration stories</p><h2>Customer Review Highlights</h2></div><p className="lede">What local customers value when they choose a cake for the moment.</p></div>
          <div className="reviews-shell">{reviewHighlights.slice(0, 3).map((review, index) => <article className={`review-slide ${reviewIndex === index ? "active" : ""}`} key={`${review.name}-${index}`}><div><div className="review-stars" aria-label={`${review.rating} out of 5 stars`}>{"★".repeat(review.rating)}</div><blockquote>“{review.quote}”</blockquote><div className="review-person"><strong>{review.name}</strong><span>{review.place}</span></div></div></article>)}
            {reviewHighlights.length > 1 && <div className="review-controls"><button className="review-control" type="button" aria-label="Previous review" onClick={() => setReviewIndex((reviewIndex + reviewHighlights.length - 1) % reviewHighlights.length)}>←</button><div className="review-dots">{reviewHighlights.slice(0, 3).map((review, index) => <button className={`review-dot ${reviewIndex === index ? "active" : ""}`} key={`${review.name}-dot-${index}`} type="button" aria-label={`Show review ${index + 1}`} onClick={() => setReviewIndex(index)} />)}</div><button className="review-control" type="button" aria-label="Next review" onClick={() => setReviewIndex((reviewIndex + 1) % reviewHighlights.length)}>→</button></div>}
          </div>
        </div></section>}

      </main>

      <footer id="footer-contact">
        <div className="footer-trust"><div className="container footer-trust-grid"><div className="footer-trust-item"><span><strong>Same Day Delivery</strong><span>Selected cakes & nearby areas</span></span></div><div className="footer-trust-item"><span><strong>Freshly Baked</strong><span>Prepared with care for every order</span></span></div><div className="footer-trust-item"><span><strong>Secure Payments</strong><span>Flexible payment options available</span></span></div></div></div>
        <div className="container footer-main"><div className="footer-grid">
          <section className="footer-updates-card"><p>Darby's updates</p><h3>Offers &amp; fresh cake alerts.</h3><span>Get seasonal cakes, limited offers and festival order reminders directly on WhatsApp.</span><a href="https://wa.me/919835888631?text=Hi%20Darby%27s%20Pastries%2C%20please%20send%20me%20your%20new%20cake%20and%20offer%20updates." target="_blank" rel="noreferrer">Get WhatsApp updates <b aria-hidden="true">→</b></a><small>No spam — opt out anytime by messaging us.</small></section>
          <section><div className="footer-brand"><img src={asset("9ce04fb5e8b4.png")} alt="Darby's Pastries logo" /><div><strong>Darby's Pastries</strong><span>FRESHLY BAKED</span></div></div><p className="footer-tagline">Fresh cakes for everyday moments and memorable celebrations.</p><p className="footer-address">No. 52/1, Maheshwaramma Temple Road, Opp. Saraswathinagar, Mahadevapura Village and Post, Bengaluru - 560048</p><div className="footer-contact-list"><a className="footer-contact-link" href="https://wa.me/919835888631?text=Hello%20Darby%27s%20Pastries" target="_blank" rel="noreferrer">WhatsApp 98358 88631</a><a className="footer-contact-link" href="tel:+919835888631">Call 98358 88631</a><span className="footer-contact-link">Daily · 8 AM - 12 PM</span></div><div className="footer-contact-socials"><a className="footer-social" href="https://wa.me/919835888631" target="_blank" rel="noreferrer" aria-label="WhatsApp"><svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M20.5 3.5A11.8 11.8 0 0 0 12.1 0C5.6 0 .3 5.3.3 11.8c0 2.1.6 4.1 1.6 5.8L.2 24l6.6-1.7a11.8 11.8 0 0 0 5.3 1.3h.1c6.5 0 11.8-5.3 11.8-11.8 0-3.2-1.3-6.1-3.5-8.3ZM12.1 21.6a9.8 9.8 0 0 1-5-1.4l-.4-.2-3.9 1 1-3.8-.3-.4a9.8 9.8 0 1 1 8.6 4.8Zm5.4-7.4c-.3-.2-1.8-.9-2.1-1s-.5-.2-.7.2-.8 1-.9 1.2-.3.3-.6.1a8 8 0 0 1-2.5-1.5 9.2 9.2 0 0 1-1.7-2.1c-.2-.3 0-.4.1-.6l.4-.5.2-.4c.1-.2 0-.4 0-.5l-1-2.3c-.2-.5-.5-.4-.7-.4h-.6c-.2 0-.5.1-.7.4s-1 1-1 2.5 1 2.9 1.2 3.1a11.3 11.3 0 0 0 4.4 4 10.7 10.7 0 0 0 1.5.6c.6.2 1.1.2 1.5.1.5-.1 1.8-.7 2-1.4s.3-1.3.2-1.4-.3-.2-.6-.4Z" /></svg></a><a className="footer-social" href="https://www.instagram.com/explore/locations/109932988176025" target="_blank" rel="noreferrer" aria-label="Instagram"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" strokeWidth="2"/><circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2"/><circle cx="17.4" cy="6.7" r="1.15" fill="currentColor"/></svg></a></div></section>
          <section className="footer-column"><h3>Quick Links</h3><nav><a href="#home">Home</a><a href="#menu">Menu</a><a href="#custom">Custom Cakes</a><a href="#reviews">Reviews</a><a href="#footer-contact">Contact</a></nav></section>
          <section className="footer-column"><h3>Cake Categories</h3><nav><Link to="/?mainCategory=cakes&cakeSubcategory=classic#menu">Classic Cakes</Link><Link to="/?mainCategory=cakes&cakeSubcategory=chocolate#menu">Chocolate Cakes</Link><Link to="/?mainCategory=cakes&cakeSubcategory=fruit#menu">Fruit Cakes</Link><Link to="/?mainCategory=cakes&cakeSubcategory=special#menu">Premium and Special Cake</Link><Link to="/?mainCategory=cakes&cakeSubcategory=photo#menu">Photo Cakes</Link><Link to="/?mainCategory=cakes&cakeSubcategory=desserts#menu">Desserts</Link></nav></section>
          <section className="footer-column"><h3>Customer Care</h3><nav>{[["about-us", "About Us"], ["contact-us", "Contact Us"], ["shipping-delivery", "Shipping & Delivery"], ["returns-refunds", "Returns & Refunds"], ["cancellation", "Cancellation Policy"], ["coupons", "Coupon & Discount Policy"], ["privacy", "Privacy Policy"], ["terms", "Terms & Conditions"], ["cookies", "Cookie Notice"]].map(([slug, label]) => <button className="footer-text-link" type="button" key={slug} onClick={() => setCustomerCarePage(slug)}>{label}</button>)}</nav></section>
          <section className="footer-column footer-newsletter-card"><p className="footer-newsletter-kicker">Darby's insider list</p><h3>Fresh bakes, first dibs.</h3><p className="footer-newsletter-copy">Seasonal flavours, celebration ideas and special offers—sent only when there is something worth sharing.</p><form className="footer-newsletter-form" onSubmit={(event) => { event.preventDefault(); setDialog("How to Order"); }}><div className="footer-newsletter-field"><input type="email" aria-label="Email address" placeholder="Your email address" required /><button type="submit">Join list</button></div></form><p className="footer-newsletter-note">We send updates via Email & WhatsApp</p><div className="footer-socials"><a className="footer-social" href="https://wa.me/919835888631" target="_blank" rel="noreferrer" aria-label="WhatsApp"><svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M20.5 3.5A11.8 11.8 0 0 0 12.1 0C5.6 0 .3 5.3.3 11.8c0 2.1.6 4.1 1.6 5.8L.2 24l6.6-1.7a11.8 11.8 0 0 0 5.3 1.3h.1c6.5 0 11.8-5.3 11.8-11.8 0-3.2-1.3-6.1-3.5-8.3ZM12.1 21.6a9.8 9.8 0 0 1-5-1.4l-.4-.2-3.9 1 1-3.8-.3-.4a9.8 9.8 0 1 1 8.6 4.8Zm5.4-7.4c-.3-.2-1.8-.9-2.1-1s-.5-.2-.7.2-.8 1-.9 1.2-.3.3-.6.1a8 8 0 0 1-2.5-1.5 9.2 9.2 0 0 1-1.7-2.1c-.2-.3 0-.4.1-.6l.4-.5.2-.4c.1-.2 0-.4 0-.5l-1-2.3c-.2-.5-.5-.4-.7-.4h-.6c-.2 0-.5.1-.7.4s-1 1-1 2.5 1 2.9 1.2 3.1a11.3 11.3 0 0 0 4.4 4 10.7 10.7 0 0 0 1.5.6c.6.2 1.1.2 1.5.1.5-.1 1.8-.7 2-1.4s.3-1.3.2-1.4-.3-.2-.6-.4Z" /></svg></a><a className="footer-social" href="https://www.instagram.com/explore/locations/109932988176025" target="_blank" rel="noreferrer" aria-label="Instagram"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" strokeWidth="2"/><circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2"/><circle cx="17.4" cy="6.7" r="1.15" fill="currentColor"/></svg></a></div></section>
        </div><div className="footer-bottom"><span>© 2026 <strong>Darby's Pastries</strong>. All rights reserved.</span><span>Made with love in Bangalore</span></div></div>
      </footer>

      {panel && <Suspense fallback={null}><StorefrontPanels
        panel={panel}
        setPanel={setPanel}
        cart={cart}
        cartCount={cartCount}
        wishlist={wishlist}
        wishlistCount={wishlistCount}
        setWishlist={setWishlist}
        cartTotal={cartTotal}
        updateCartQuantity={updateCartQuantity}
        addToCart={addToCart}
        buildOrderCartLink={buildOrderCartLink}
        placeCartOrder={placeCartOrder}
      /></Suspense>}
      {adminOpen && <Suspense fallback={null}><AdminPanel hero={hero} onHeroChange={setHero} onClose={() => setAdminOpen(false)} /></Suspense>}

      {dialog && <div className="panel-backdrop open" onClick={() => setDialog("")}><div className="resource-dialog open" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}><div className="panel-header"><h2>{dialog}</h2><button className="panel-close" type="button" onClick={() => setDialog("")}>×</button></div><div className="panel-scroll"><p>{dialogContent[dialog]?.body || "More information is coming soon."}</p></div></div></div>}
    </div>
  );
}

export default HomePage;

function CustomerCareCard({ slug, onClose }) {
  const page = policyPages[slug];
  if (!page) return null;
  return <section className="customer-care-overlay" role="dialog" aria-modal="true" aria-label={page.title}><article className="customer-care-card"><button className="customer-care-close" type="button" onClick={onClose} aria-label={`Close ${page.title}`}>×</button><p className="policy-eyebrow">DARBY'S PASTRIES · CUSTOMER INFORMATION</p><h1>{page.title}</h1><p className="policy-updated">Last updated: 26 October 2026</p>{page.sections.map(([heading, copy]) => <section key={heading}><h2>{heading}</h2>{copy.split("\n").map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</section>)}</article></section>;
}

function AccountButton({ signedIn, onOpenAccount }) {
  const [open, setOpen] = useState(false);

  if (signedIn) {
    return <button className="quick-link" type="button" onClick={onOpenAccount}>
      <AccountIcon />
      <span>Account</span>
    </button>;
  }

  return <div className="account-quick-menu">
    <button className="quick-link" type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-haspopup="menu">
      <AccountIcon />
      <span>Account</span>
    </button>
    {open && <div className="account-quick-dropdown" role="menu">
      <a href="/sign-in" role="menuitem">Log In</a>
      <a href="/sign-up" role="menuitem">Sign Up</a>
    </div>}
  </div>;
}

function AccountIcon() {
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2"/><path d="M4.5 20c.8-4 3.3-6 7.5-6s6.7 2 7.5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>;
}

function ClerkAccountQuickAction({ onOpenAccount }) {
  const { isSignedIn } = useUser();
  return <AccountButton signedIn={isSignedIn} onOpenAccount={onOpenAccount} />;
}

function AccountQuickAction({ onOpenAccount }) {
  if (!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY) return <AccountButton signedIn={false} onOpenAccount={onOpenAccount} />;
  return <ClerkAccountQuickAction onOpenAccount={onOpenAccount} />;
}
