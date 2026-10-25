import { useEffect, useState } from "react";
import { useAuth, useUser } from "@clerk/react";

import ProductCard from "../../features/menu/components/ProductCard";
import { getImageFor } from "../../features/menu/data/menuData";
import useMenuCatalog from "../../features/menu/hooks/useMenuCatalog";
import StorefrontPanels from "../../features/storefront/components/StorefrontPanels";
import AdminPanel from "../../features/admin/components/AdminPanel";
import "../../features/storefront/styles/storefront-panels.css";
import useCart from "../../features/cart/hooks/useCart";
import useWishlist from "../../features/wishlist/hooks/useWishlist";
import useCustomCakeBuilder, { flavourRates, shapeSurcharge } from "../../features/custom-cakes/hooks/useCustomCakeBuilder";
import { asset, rupees, whatsappOrderLink } from "../../utils/storefrontUtils";
import { apiUrl } from "../../utils/apiUrl";

const categoryDefaults = [
  { id: "classic", label: "Classic Cakes", detail: "Black Forest Classic, White Forest, Vanilla Truffle", image: "", action: "classic" },
  { id: "chocolate", label: "Chocolate Cakes", detail: "Double Chocolate, Choco Chips, Choco Truffle, Choco Oreo Forest, Belgium Chocolate", image: "", action: "chocolate" },
  { id: "fruit", label: "Fruit Cakes", detail: "Pineapple, Mango, Strawberry, Blueberry, Black Currant", image: "", action: "fruit" },
  { id: "special", label: "Premium & Special Cakes", detail: "Rasmalai, Irish Coffee, Caramel Butterscotch, Dry Fruit, Mango Almond, Honey Almond", image: "", action: "special" },
  { id: "custom", label: "Photo Cakes", detail: "Photo cakes and custom designs", image: "", action: "custom" },
  { id: "desserts", label: "Desserts", detail: "Donuts, Choco Lava, Cup Cakes, Cake Pops, Brownies, Apple Pie", image: "", action: "desserts" },
];

function HomePage() {
  const { isLoaded: isAuthLoaded, isSignedIn, getToken } = useAuth();
  const [hero, setHero] = useState({ eyebrow: "Handcrafted with love", title: "Freshly Baked Cakes For Every Celebration", description: "Choose from our client-approved cake flavours, desserts, flowers and chocolates.", badge: "Starting from ₹350", image: "101920fbaa29.jpg", imageSecond: "9c4c74910c48.jpg", imageThird: "2a95b9ea83e2.jpg" });
  const [categories, setCategories] = useState(categoryDefaults);
  const [customCakeSummaryImage, setCustomCakeSummaryImage] = useState("/images/custom-cake-summary.jpg");

  const [activeCategory] = useState("classic");
  const [activeFilter, setActiveFilter] = useState({ kind: "bestseller", label: "Featured Cakes" });
  const [query, setQuery] = useState("");
  const [panel, setPanel] = useState("");
  const [dialog, setDialog] = useState("");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [canAccessAdmin, setCanAccessAdmin] = useState(false);
  const [reviewIndex, setReviewIndex] = useState(0);
  const visibleProducts = useMenuCatalog({ activeCategory, activeFilter, query });
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
    if (params.get("account") !== "1") return;

    setPanel("account");
    window.history.replaceState({}, "", window.location.pathname + window.location.hash);
  }, []);

  useEffect(() => {
    fetch(apiUrl("/api/site-settings"), { cache: "no-store" }).then((response) => response.ok ? response.json() : null).then((payload) => {
      if (payload?.data?.hero) setHero((current) => ({ ...current, ...payload.data.hero }));
      if (payload?.data?.customCakeSummaryImage) setCustomCakeSummaryImage(payload.data.customCakeSummaryImage);
      if (Array.isArray(payload?.data?.categories)) setCategories(payload.data.categories);
    }).catch(() => {});
  }, []);

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
      setMobileNavOpen(false);
      document.getElementById("custom")?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    setActiveFilter(filter);
    setQuery("");
    setMobileNavOpen(false);
    document.getElementById("menu")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const browseAllCakes = () => {
    setActiveFilter({ kind: "all", label: "All Cakes" });
    setQuery("");
    document.getElementById("menu")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };


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
        <div className="container header-main">
          <button className="menu-toggle" type="button" aria-label="Open navigation menu" aria-expanded={mobileNavOpen} onClick={() => setMobileNavOpen((value) => !value)}>
            <span />
            <span />
            <span />
          </button>

          <a className="brand-link" href="/" aria-label="Darby's Pastries home" onClick={() => setMobileNavOpen(false)}>
            <img className="brand-logo" src={asset("9ce04fb5e8b4.png")} alt="Darby's Pastries logo" />
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
            <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search cakes, flavours & categories" aria-label="Search by cake name, flavour or category" />
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
            <nav className={`nav-links ${mobileNavOpen ? "open" : ""}`} aria-label="Main navigation">
              <div className="mobile-drawer-head"><strong>Browse Darby's</strong><button type="button" onClick={() => setMobileNavOpen(false)}>×</button></div>
              <div className="nav-item"><a className="nav-link" href="#home" onClick={() => setMobileNavOpen(false)}>Home</a></div>
              <div className="nav-item"><button type="button" className="nav-link" onClick={() => openMenuToFilter({ kind: "category", value: "classic", label: "Classic Cakes" })}>Classic Cakes</button></div>
              <div className="nav-item"><button type="button" className="nav-link" onClick={() => openMenuToFilter({ kind: "category", value: "chocolate", label: "Chocolate Cakes" })}>Chocolate Cakes</button></div>
              <div className="nav-item"><button type="button" className="nav-link" onClick={() => openMenuToFilter({ kind: "category", value: "fruit", label: "Fruit Cakes" })}>Fruit Cakes</button></div>
              <div className="nav-item"><button type="button" className="nav-link" onClick={() => openMenuToFilter({ kind: "special", label: "Premium & Special Cakes" })}>Premium & Special</button></div>
              <div className="nav-item"><button type="button" className="nav-link" onClick={() => openMenuToFilter({ kind: "category", value: "desserts", label: "Desserts" })}>Desserts</button></div>
              <div className="nav-item"><button type="button" className="nav-link" onClick={() => openMenuToFilter({ kind: "custom" })}>Custom Cakes</button></div>
              <div className="nav-item"><button type="button" className="nav-link" onClick={() => openMenuToFilter({ kind: "bestseller", label: "Best Sellers" })}>Best Sellers</button></div>
              <div className="nav-item"><a className="nav-link" href="#footer-contact" onClick={() => setMobileNavOpen(false)}>Contact</a></div>
            </nav>
            <nav className="legacy-desktop-nav" aria-label="Main navigation">
              <a href="#home">Home</a>
              <button type="button" onClick={() => openMenuToFilter({ kind: "category", value: "classic", label: "Classic Cakes" })}>Classic Cakes</button>
              <button type="button" onClick={() => openMenuToFilter({ kind: "category", value: "chocolate", label: "Chocolate Cakes" })}>Chocolate Cakes</button>
              <button type="button" onClick={() => openMenuToFilter({ kind: "category", value: "fruit", label: "Fruit Cakes" })}>Fruit Cakes</button>
              <button type="button" onClick={() => openMenuToFilter({ kind: "special", label: "Premium & Special Cakes" })}>Premium & Special</button>
              <button type="button" onClick={() => openMenuToFilter({ kind: "category", value: "desserts", label: "Desserts" })}>Desserts</button>
              <button type="button" onClick={() => openMenuToFilter({ kind: "custom" })}>Custom Cakes</button>
              <button type="button" onClick={() => openMenuToFilter({ kind: "bestseller", label: "Best Sellers" })}>Best Sellers</button>
              <a href="#footer-contact">Contact</a>
            </nav>
          </div>
        </div>
      </header>

      <main>
        <section className="hero" id="home">
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
                <figure className="hero-tile hero-tile-main"><img className="hero-photo" src={asset(hero.image)} alt="Rich chocolate celebration cake" decoding="async" fetchPriority="high" /><figcaption>Chocolate Celebration Cake</figcaption></figure>
                <figure className="hero-tile hero-tile-small"><img className="hero-photo" src={asset(hero.imageSecond)} alt="Black Forest birthday cake" decoding="async" /><figcaption>Birthday Cake</figcaption></figure>
                <figure className="hero-tile hero-tile-small"><img className="hero-photo" src={asset(hero.imageThird)} alt="Designer cake" decoding="async" /><figcaption>Designer Cake</figcaption></figure>
              </div>
              <div className="hero-badge">Starting from ₹350</div>
            </div>
          </div>
        </section>

        <section className="usp-section" aria-label="Why choose Darby's Pastries">
          <div className="container usp-grid">
            <article className="usp-card"><span className="usp-icon">🚚</span><div><h3>Same Day Delivery</h3><p>Selected cakes delivered across nearby KR Puram areas.</p></div></article>
            <article className="usp-card"><span className="usp-icon">🎂</span><div><h3>Custom Cakes</h3><p>Made to your theme, colours, message and serving size.</p></div></article>
            <article className="usp-card"><span className="usp-icon">🥚</span><div><h3>Eggless Available</h3><p>Eggless versions available across the cake menu.</p></div></article>
            <article className="usp-card"><span className="usp-icon">⭐</span><div><h3>4.8 Customer Rating</h3><p>A locally loved choice for cakes and celebrations.</p></div></article>
          </div>
        </section>

        <section className="category-section" aria-labelledby="categoryTitle">
          <div className="container">
            <div className="section-head"><div><p className="eyebrow">Made for every moment</p><h2 id="categoryTitle">Shop By Category</h2></div><p className="lede">Find the perfect cake for every celebration.</p></div>
            <div className="category-grid">
              {categories.map((category) => (
                <button key={category.id} className="category-card" type="button" onClick={() => openMenuToFilter(category.action === "custom" ? { kind: "custom" } : category.action === "special" ? { kind: "special", label: category.label } : { kind: "category", value: category.action || "all", label: category.label })}>
                  {category.image ? <img src={asset(category.image)} alt={category.label} loading="lazy" decoding="async" /> : <span className="category-card-placeholder">Darby's Pastries</span>}
                  <span className="category-card-body"><h3>{category.label}</h3></span>
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="menu-section section" id="menu">
          <div className="container">
            <div className="section-head featured-section-head">
              <div><p className="eyebrow">Customer favourites</p><h2>{activeFilter?.label || "Featured Cakes"}</h2></div>
              <div className="featured-section-actions">
                <p className="lede">Choose a weight and order directly on WhatsApp.</p>
                <button type="button" className="browse-all-cakes" onClick={browseAllCakes}>Browse All Cakes <span aria-hidden="true">→</span></button>
              </div>
            </div>
            <div className="menu-grid">
              {visibleProducts.length ? (
                visibleProducts.map((product) => (
                  <ProductCard key={`${product.category}-${product.name}`} product={product} wishlist={wishlist} cart={cart} toggleWishlist={toggleWishlist} addToCart={addToCart} openCart={() => setPanel("cart")} />
                ))
              ) : (
                <div className="empty-menu">No matching products found. Try another search or category.</div>
              )}
            </div>
          </div>
        </section>

        <section className="custom-banner" id="custom">
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
                  <div className="builder-field"><label htmlFor="customDeliveryTime">Delivery time slot</label><select id="customDeliveryTime" value={builder.deliveryTime} onChange={(e) => updateBuilderField("deliveryTime", e.target.value)}><option value="">Select a time slot</option><option>Morning (9 AM - 12 PM)</option><option>Afternoon (12 PM - 4 PM)</option><option>Evening (4 PM - 8 PM)</option></select></div>
                  <div className="builder-field"><label htmlFor="customPincode">Pincode</label><input id="customPincode" value={builder.pincode} onChange={(e) => updateBuilderField("pincode", e.target.value)} inputMode="numeric" maxLength={6} /></div>
                  {builder.deliveryType === "Home Delivery" && <div className="builder-field full"><label htmlFor="customAddress">Full delivery address</label><textarea id="customAddress" value={builder.address} onChange={(e) => updateBuilderField("address", e.target.value)} placeholder="House / flat, street and area" /></div>}
                </div></section>
                <section className="builder-panel"><h3>Customer details</h3><div className="builder-form-grid"><div className="builder-field"><label htmlFor="customCustomerName">Customer name</label><input id="customCustomerName" value={builder.customerName} onChange={(e) => updateBuilderField("customerName", e.target.value)} /></div><div className="builder-field"><label htmlFor="customPhone">WhatsApp / mobile number</label><input id="customPhone" value={builder.phone} onChange={(e) => updateBuilderField("phone", e.target.value)} type="tel" inputMode="tel" placeholder="10-digit mobile number" /></div></div></section>
                <div className="builder-actions"><button type="submit" className="btn btn-primary builder-submit">Send order on WhatsApp →</button></div><p className="builder-status" role="status" aria-live="polite">{builderStatus}</p>
              </div>
              <aside className="builder-summary" aria-label="Live custom cake price estimate"><div className="builder-summary-sticky"><p className="builder-summary-kicker">Order summary</p><h3>Your cake summary</h3><img className="custom-summary-cake-image" src={customCakeSummaryImage} alt="Pink strawberry celebration cake" /><div className="builder-price"><span>Estimated total</span><strong>{rupees(estimate)}</strong></div><dl className="builder-breakdown"><div><dt>Occasion</dt><dd>{builder.occasion}</dd></div><div><dt>Flavour</dt><dd>{builder.flavour}</dd></div><div><dt>Weight</dt><dd>{builder.weight === 0.5 ? "500 g" : `${builder.weight} kg`}</dd></div><div><dt>Egg preference</dt><dd>{builder.eggPreference}</dd></div><div><dt>Shape</dt><dd>{builder.shape}</dd></div>{builder.cakeMessage && <div><dt>Message</dt><dd>{builder.cakeMessage}</dd></div>}<div><dt>Delivery</dt><dd>{builder.deliveryType}</dd></div>{builder.deliveryTime && <div><dt>Time</dt><dd>{builder.deliveryDate} · {builder.deliveryTime}</dd></div>}<div><dt>Customer</dt><dd>{builder.customerName || "—"}</dd></div></dl><div className="advance-strip"><span>Estimated 50% advance</span><strong>{rupees(advanceAmount)}</strong></div><p className="estimate-note">Final price and delivery charges will be confirmed by Darby's Pastries.</p></div></aside>
            </form>)}
          </div>
        </section>

        <section className="reviews-section" id="reviews"><div className="container"><div className="section-head"><div><p className="eyebrow">Celebration stories</p><h2>Customer Review Highlights</h2></div><p className="lede">What local customers value when they choose a cake for the moment.</p></div><div className="reviews-shell">{[["A wide choice of familiar flavours, with eggless and custom-design options when the occasion calls for something personal.", "Birthday cake order", "KR Puram, Bengaluru"], ["From a half-kilo cake to a larger celebration centrepiece, it is easy to find the right size and flavour.", "Family celebration", "Bengaluru"], ["Indian-inspired flavours such as Rasmalai sit alongside rich chocolate favourites for a menu with range.", "Flavour discovery", "KR Puram, Bengaluru"]].map(([quote, name, place], index) => <article className={`review-slide ${reviewIndex === index ? "active" : ""}`} key={name}><div><div className="review-stars" aria-label="5 out of 5 stars">★★★★★</div><blockquote>“{quote}”</blockquote><div className="review-person"><strong>{name}</strong><span>{place}</span></div></div></article>)}<div className="review-controls"><button className="review-control" type="button" aria-label="Previous review" onClick={() => setReviewIndex((reviewIndex + 2) % 3)}>←</button><div className="review-dots">{[0, 1, 2].map((index) => <button className={`review-dot ${reviewIndex === index ? "active" : ""}`} key={index} type="button" aria-label={`Show review ${index + 1}`} onClick={() => setReviewIndex(index)} />)}</div><button className="review-control" type="button" aria-label="Next review" onClick={() => setReviewIndex((reviewIndex + 1) % 3)}>→</button></div></div></div></section>

        <section className="faq-section" id="faq"><div className="container faq-layout"><div><p className="eyebrow">Good to know</p><h2>Frequently Asked Questions</h2><p className="lede">Quick answers before you place your order.</p></div><div className="faq-list"><details className="faq-item" open><summary>How to order?</summary><p>Choose a menu cake and continue on WhatsApp, or use the Custom Cake Builder for a themed cake.</p></details><details className="faq-item"><summary>Do you offer same day delivery?</summary><p>Same-day delivery is available for selected cakes and nearby areas, subject to stock and delivery capacity.</p></details><details className="faq-item"><summary>Can I order photo cakes?</summary><p>Yes. Send your photo, preferred flavour, weight and required date on WhatsApp so the bakery can confirm print quality.</p></details><details className="faq-item"><summary>Do you offer eggless cakes?</summary><p>Yes. Eggless preparation is available across cake flavours for an additional ₹50.</p></details></div></div></section>
      </main>

      <footer id="footer-contact">
        <div className="footer-trust"><div className="container footer-trust-grid"><div className="footer-trust-item"><span><strong>Same Day Delivery</strong><span>Selected cakes & nearby areas</span></span></div><div className="footer-trust-item"><span><strong>Freshly Baked</strong><span>Prepared with care for every order</span></span></div><div className="footer-trust-item"><span><strong>Secure Payments</strong><span>Flexible payment options available</span></span></div></div></div>
        <div className="container footer-main"><div className="footer-grid">
          <section><div className="footer-brand"><img src={asset("9ce04fb5e8b4.png")} alt="Darby's Pastries logo" /><div><strong>Darby's Pastries</strong><span>FRESHLY BAKED</span></div></div><p className="footer-tagline">Fresh cakes for everyday moments and memorable celebrations.</p><p className="footer-address">Site No. 3, Opposite Krishna Driving School, KR Puram Road, Bangalore - 560036</p><div className="footer-contact-list"><a className="footer-contact-link" href="https://wa.me/919835888631?text=Hello%20Darby%27s%20Pastries" target="_blank" rel="noreferrer">WhatsApp 98358 88631</a><a className="footer-contact-link" href="tel:+918789274593">Call 87892 74593</a><span className="footer-contact-link">Daily · 10:00 AM - 9:00 PM</span></div></section>
          <section className="footer-column"><h3>Quick Links</h3><nav><a href="#home">Home</a><a href="#menu">Menu</a><a href="#custom">Custom Cakes</a><a href="#reviews">Reviews</a><a href="#footer-contact">Contact</a></nav></section>
          <section className="footer-column"><h3>Cake Categories</h3><nav><a href="#menu">Birthday Cakes</a><a href="#menu">Anniversary Cakes</a><a href="#menu">Photo Cakes</a><a href="#custom">Designer Cakes</a><a href="#menu">Eggless Cakes</a></nav></section>
          <section className="footer-column"><h3>Customer Care</h3><nav><button type="button" className="footer-text-link" onClick={() => setDialog("How to Order")}>How to Order</button><button type="button" className="footer-text-link" onClick={() => setDialog("Delivery & Pickup")}>Delivery & Pickup</button><button type="button" className="footer-text-link" onClick={() => setDialog("FAQ")}>FAQ</button><button type="button" className="footer-text-link" onClick={() => setDialog("Privacy Policy")}>Privacy Policy</button><button type="button" className="footer-text-link" onClick={() => setDialog("Terms & Conditions")}>Terms & Conditions</button></nav></section>
          <section className="footer-column footer-newsletter-card"><p className="footer-newsletter-kicker">Darby's insider list</p><h3>Fresh bakes, first dibs.</h3><p className="footer-newsletter-copy">Seasonal flavours, celebration ideas and special offers—sent only when there is something worth sharing.</p><form className="footer-newsletter-form" onSubmit={(event) => { event.preventDefault(); setDialog("How to Order"); }}><div className="footer-newsletter-field"><input type="email" aria-label="Email address" placeholder="Your email address" required /><button type="submit">Join list</button></div></form><p className="footer-newsletter-note">We send updates via Email & WhatsApp</p><div className="footer-socials"><a className="footer-social" href="https://wa.me/919835888631" target="_blank" rel="noreferrer" aria-label="WhatsApp">W</a><a className="footer-social" href="https://www.instagram.com/explore/locations/109932988176025" target="_blank" rel="noreferrer" aria-label="Instagram">I</a></div></section>
        </div><div className="footer-bottom"><span>© 2026 <strong>Darby's Pastries</strong>. All rights reserved.</span><span>Made with love in Bangalore</span></div></div>
      </footer>

      <StorefrontPanels
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
      />
      {adminOpen && <AdminPanel hero={hero} onHeroChange={setHero} onClose={() => setAdminOpen(false)} />}

      {dialog && <div className="panel-backdrop open" onClick={() => setDialog("")}><div className="resource-dialog open" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}><div className="panel-header"><h2>{dialog}</h2><button className="panel-close" type="button" onClick={() => setDialog("")}>×</button></div><div className="panel-scroll"><p>{dialogContent[dialog]?.body || "More information is coming soon."}</p></div></div></div>}
    </div>
  );
}

export default HomePage;

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
      <button type="button" role="menuitem" onClick={() => window.location.assign("/sign-in")}>Log In</button>
      <button type="button" role="menuitem" onClick={() => window.location.assign("/sign-up")}>Sign Up</button>
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
