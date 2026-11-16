import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { cakeSizeOptions, labels } from "../data/menuData";
import { asset, responsiveImageSrcSet, rupees, whatsappOrderLink } from "../../../utils/storefrontUtils";

const fallbackImageByCategory = {
  classic: "9c4c74910c48.jpg",
  chocolate: "101920fbaa29.jpg",
  fruit: "2a95b9ea83e2.jpg",
  special: "2a95b9ea83e2.jpg",
  desserts: "101920fbaa29.jpg",
};

export default function ProductCard({ product, wishlist, cart, toggleWishlist, addToCart, openCart, showDetailsLink = true }) {
  const isCake = product.mainCategory === "cakes" || ["classic", "chocolate", "fruit", "special", "photo", "desserts", "custom"].includes(product.category);
  const options = useMemo(() => {
    const apiOptions = (product.variants || []).filter((variant) => variant.active !== false && (variant.stockQuantity == null || variant.stockQuantity > 0)).map((variant) => [variant.label, variant.price, variant._id]);
    const availableOptions = isCake || apiOptions.length
      ? apiOptions
      : [["500 g", product.p500], ["1 kg", product.p1kg]].filter(([, price]) => price != null);
    if (!isCake) return availableOptions;
    const sizeOrder = new Map(cakeSizeOptions.map(([label], index) => [label.toLowerCase(), index]));
    return [...availableOptions].sort(([first], [second]) =>
      (sizeOrder.get(String(first).toLowerCase()) ?? Number.MAX_SAFE_INTEGER)
      - (sizeOrder.get(String(second).toLowerCase()) ?? Number.MAX_SAFE_INTEGER)).slice(0, 2);
  }, [product.variants, product.p500, product.p1kg, isCake]);
  const defaultOption = useMemo(
    () => options[0] || ["Price", isCake ? 0 : product.p500 ?? product.p1kg ?? 0],
    [options, isCake, product.p500, product.p1kg],
  );
  const [selected, setSelected] = useState(defaultOption);

  useEffect(() => {
    setSelected(defaultOption);
  }, [defaultOption, product.name, product.p500, product.p1kg]);

  const currentPrice = Number(selected[1] ?? (isCake ? 0 : product.p500 ?? product.p1kg ?? 0));
  const displayOptionLabel = (label) => {
    const packSize = String(label || "").match(/\bpack\s*of\s*(\d+)\b/i)?.[1];
    return `Pack of ${packSize && Number(packSize) > 0 ? Number(packSize) : 1}`;
  };
  const saved = wishlist.some((entry) => entry.name === product.name && entry.category === product.category);
  const selectedVariantId = options.find(([label]) => label === selected[0])?.[2] || product.variants?.find((variant) => variant.label === selected[0])?._id;
  const cartId = `${product.category || "product"}:${product.name}:${selectedVariantId || selected[0] || "default"}`;
  const inCart = cart.some((entry) => entry.cartId === cartId);
  const isGift = ["flowers", "chocolates", "accessories", "gift-hampers"].includes(product.category);
  const [zoomed, setZoomed] = useState(false);
  const fallbackImage = asset(fallbackImageByCategory[product.category] || "101920fbaa29.jpg");
  const imageSource = product.image || fallbackImage;
  const imageSrcSet = responsiveImageSrcSet(imageSource);

  return (
    <article className={`menu-item menu-item--${product.category || "default"}`}>
      <div className="menu-image-wrap">
        <button type="button" className="image-zoom-trigger" onClick={() => setZoomed(true)} aria-label={`Zoom ${product.name} image`}><img className="menu-image" src={imageSource} srcSet={imageSrcSet} sizes="(max-width: 540px) 100vw, (max-width: 900px) 50vw, 25vw" onError={(event) => {
          if (product.image && event.currentTarget.getAttribute("src") !== fallbackImage) {
            event.currentTarget.src = fallbackImage;
          }
        }} alt={product.imageAlt || `${product.name} cake`} loading="lazy" decoding="async" /></button>
        <button
          type="button"
          className="wishlist-toggle"
          aria-label={`${saved ? "Remove" : "Add"} ${product.name} ${saved ? "from" : "to"} wishlist`}
          aria-pressed={saved}
          onClick={() => toggleWishlist({ ...product, price: currentPrice, weight: selected[0] })}
        >
          {saved ? "♥" : "♡"}
        </button>
        <span className="menu-image-note">{product.image ? "Product image" : "Representative image"}</span>
      </div>

      <div className="menu-card-body">
        <div className="menu-top">
          <div>
            <span className="category-tag">{product.subcategory || product.categoryLabel || labels[product.category] || product.category}</span>
            <h3>{product.name}</h3>
            {showDetailsLink && product.id && <Link className="product-card-detail-link" to={`/products/${product.id}`}>View details</Link>}
            <span className="egg-badge">{product.category === "flowers" ? "Fresh bouquet" : ["chocolates", "gift-hampers"].includes(product.category) ? "Gift ready" : "Freshly baked"}</span>
          </div>
        </div>

        {product.category === "desserts" && options.length === 1 ? (
          <div className="item-price">
            <span>Price</span>
            <strong>{rupees(currentPrice)}</strong>
          </div>
        ) : isCake ? (
          <div className="card-weight-picker">
            <span className="card-weight-label">Choose cake size</span>
            <div className="card-weight-options">
              {options.map(([weight, price]) => (
                <button
                  key={weight}
                  type="button"
                  className={`card-weight-option ${selected[0] === weight ? "active" : ""}`}
                  onClick={() => setSelected([weight, Number(price)])}
                >
                  <span>{weight}</span>
                  <strong>{rupees(price)}</strong>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="card-weight-picker">
            <span className="card-weight-label">{isGift ? "Choose option" : "Choose cake size"}</span>
            <div className="card-weight-options">
              {options.map(([weight, price]) => (
                <button
                  key={weight}
                  type="button"
                  className={`card-weight-option ${isGift ? "card-weight-option--gift" : ""} ${selected[0] === weight ? "active" : ""}`}
                  onClick={() => setSelected([weight, Number(price)])}
                >
                  {isGift ? (
                    <>
                      <strong>{rupees(price)}</strong>
                      <span>{displayOptionLabel(weight)}</span>
                    </>
                  ) : (
                    <>
                      <span>{weight}</span>
                      <strong>{rupees(price)}</strong>
                    </>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="card-actions">
          <a className="mini-order" href={whatsappOrderLink(product.name, currentPrice, selected[0])} target="_blank" rel="noreferrer">WhatsApp ↗</a>
          <button
            className="add-cart"
            type="button"
          aria-label={!options.length ? `${product.name} is unavailable` : inCart ? `Go to cart with ${product.name}` : `Add ${product.name} to cart`}
          disabled={!options.length}
          onClick={() => {
              if (inCart) {
                openCart();
                return;
              }
              addToCart({ ...product, cartId, price: currentPrice, weight: selected[0], variantId: selectedVariantId });
            }}
          >
            {!options.length ? "Unavailable" : inCart ? "Go to Cart" : "Add to Cart"}
          </button>
        </div>
      </div>
      {zoomed && <div className="product-image-lightbox" role="dialog" aria-modal="true" aria-label={`${product.name} image`} onClick={() => setZoomed(false)}><button type="button" className="product-image-close" aria-label="Close image">×</button><img src={imageSource} alt={product.imageAlt || `${product.name} cake`} onError={(event) => {
        if (product.image && event.currentTarget.getAttribute("src") !== fallbackImage) {
          event.currentTarget.src = fallbackImage;
        }
      }} onClick={(event) => event.stopPropagation()} /></div>}
    </article>
  );
}
