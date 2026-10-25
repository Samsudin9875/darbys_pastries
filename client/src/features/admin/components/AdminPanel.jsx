import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuthToken } from "../../../app/authToken";
import { labels } from "../../menu/data/menuData";
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
  { id: "custom", label: "Photo Cakes", detail: "Photo cakes and custom designs", image: "", action: "custom" },
  { id: "desserts", label: "Desserts", detail: "Donuts, brownies and more", image: "", action: "desserts" },
];
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
    [busy, setBusy] = useState(false),
    [search, setSearch] = useState(""),
    [filter, setFilter] = useState("all"),
    [page, setPage] = useState(1),
    [draft, setDraft] = useState(hero),
    [categories, setCategories] = useState(defaultCategories);
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
    if (p.ok) setItems((await p.json()).data);
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
          if (Array.isArray(x.data?.categories)) setCategories(x.data.categories);
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
            (filter === "all" || p.legacyCategoryKey === filter) &&
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
      await job();
      setNote(ok);
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
    }, "Product saved and images uploaded.");
  };
  const upload = (id, file, replace = false) => {
    if (!isImage(file))
      return setNote("Choose a JPEG, PNG or WebP image under 2 MB.");
    return run(
      async () => {
        const f = new FormData();
        f.append("image", file);
        const r = await api(
            `/api/admin/products/${id}/images${replace ? "/0" : ""}`,
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
          ? "Delete this product permanently?"
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
      },
      index == null ? "Product deleted." : "Image removed.",
    );
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
    const r = await api("/api/admin/site-settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ categories }) });
    const x = await r.json(); if (!r.ok) throw Error(x.message);
    setCategories(x.data.categories || []);
  }, "Category cards saved.");
  const updateCategory = (id, field, value) => setCategories((current) => current.map((category) => category.id === id ? { ...category, [field]: value } : category));
  const addCategory = () => setCategories((current) => [...current, { id: `category-${Date.now()}`, label: "New category", detail: "Add category details", image: "", action: "all" }]);
  const deleteCategory = (id) => setCategories((current) => current.filter((category) => category.id !== id));
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
                      {Object.entries(labels).map(([k, v]) => (
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
                          {labels[p.legacyCategoryKey] || p.legacyCategoryKey}
                        </span>
                        <span className="admin-status">
                          {p.active ? "Active" : "Draft"}
                        </span>
                        <span>{p.images?.length || 0} images</span>
                        <span className="navigation-actions">
                          <label className="admin-mini-action">
                            {p.images?.length ? "Update" : "Upload"}
                            <input
                              hidden
                              type="file"
                              accept="image/jpeg,image/png,image/webp"
                              onChange={(e) => upload(p._id, e.target.files[0], Boolean(p.images?.length))}
                            />
                          </label>
                          <button
                            className="admin-delete-product"
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
                <div className="category-editor-head"><div><span>Homepage collection</span><h3>Shop by Category cards</h3><small>Edit text, upload an image, add or delete cards.</small></div><button type="button" className="btn btn-secondary" onClick={addCategory}>+ Add card</button></div>
                <div className="category-admin-grid">
                  {categories.map((category) => <article className="category-admin-card" key={category.id}>
                    <div className="category-admin-image">{category.image ? <img src={category.image} alt={category.label} /> : <div className="category-admin-placeholder">Add image</div>}<label className="category-upload">{category.image ? "Update image" : "Add image"}<input type="file" accept="image/*" onChange={(e) => { uploadCategoryImage(category.id, e.target.files[0]); e.target.value = ""; }} /></label></div>
                    <div className="category-admin-fields"><label>Title<input value={category.label} maxLength="80" onChange={(e) => updateCategory(category.id, "label", e.target.value)} /></label>
                    <label>Details<textarea value={category.detail} maxLength="300" onChange={(e) => updateCategory(category.id, "detail", e.target.value)} /></label>
                    <label>Open section<select value={category.action} onChange={(e) => updateCategory(category.id, "action", e.target.value)}><option value="classic">Classic cakes</option><option value="chocolate">Chocolate cakes</option><option value="fruit">Fruit cakes</option><option value="special">Premium & special</option><option value="custom">Custom cakes</option><option value="desserts">Desserts</option><option value="all">All products</option></select></label></div>
                    <button type="button" className="admin-action danger" onClick={() => deleteCategory(category.id)}>Delete card</button>
                  </article>)}
                </div>
                <div className="hero-editor-actions"><button type="button" className="btn btn-primary" disabled={busy} onClick={saveCategories}>Save category cards</button></div>
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
                <label className="field">
                  Category
                  <select name="category">
                    {Object.entries(labels).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  Status
                  <select name="status">
                    <option>Active</option>
                    <option>Draft</option>
                  </select>
                </label>
                <label className="field">
                  500 g price
                  <input name="price500" type="number" min="1" />
                </label>
                <label className="field">
                  1 kg price
                  <input name="price1kg" type="number" min="1" />
                </label>
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
