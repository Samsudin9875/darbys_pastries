import { useEffect, useMemo, useState } from "react";

import { labels } from "../data/menuData";
import { rupees, whatsappOrderLink } from "../../../utils/storefrontUtils";

export default function ProductCard({ product, wishlist, cart, toggleWishlist, addToCart, openCart }) {
  const options = useMemo(
    () => [["500 g", product.p500], ["1 kg", product.p1kg]].filter(([, price]) => price != null),
    [product.p500, product.p1kg],
  );
  const defaultOption = useMemo(
    () => options[0] || ["Price", product.p500 ?? product.p1kg ?? 0],
    [options, product.p500, product.p1kg],
  );
  const [selected, setSelected] = useState(defaultOption);

  useEffect(() => {
    setSelected(defaultOption);
  }, [defaultOption, product.name, product.p500, product.p1kg]);

  const currentPrice = Number(selected[1] ?? product.p500 ?? product.p1kg ?? 0);
  const saved = wishlist.some((entry) => entry.name === product.name && entry.category === product.category);
  const inCart = cart.some((entry) => entry.name === product.name && entry.category === product.category && entry.weight === selected[0]);

  return (
    <article className="menu-item">
      <div className="menu-image-wrap">
        {product.image ? <img className="menu-image" src={product.image} alt={product.imageAlt || `${product.name} cake`} loading="lazy" decoding="async" /> : <div className="menu-image-placeholder" aria-label={`${product.name} image coming soon`}><span>Darby's Pastries</span><strong>Image coming soon</strong></div>}
        <button
          type="button"
          className="wishlist-toggle"
          aria-label={`${saved ? "Remove" : "Add"} ${product.name} ${saved ? "from" : "to"} wishlist`}
          aria-pressed={saved}
          onClick={() => toggleWishlist({ ...product, price: currentPrice, weight: selected[0] })}
        >
          {saved ? "♥" : "♡"}
        </button>
        {product.image ? <span className="menu-image-note">Product image</span> : null}
      </div>

      <div className="menu-card-body">
        <div className="menu-top">
          <div>
            <span className="category-tag">{product.subcategory || labels[product.category] || product.category}</span>
            <h3>{product.name}</h3>
            <span className="egg-badge">{product.category === "flowers" ? "Fresh bouquet" : product.category === "chocolates" ? "Gift ready" : "Freshly baked"}</span>
          </div>
        </div>

        {product.category === "flowers" || product.category === "chocolates" || product.category === "desserts" ? (
          <div className="item-price">
            <span>Price</span>
            <strong>{rupees(currentPrice)}</strong>
          </div>
        ) : (
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
        )}

        <div className="card-actions">
          <a className="mini-order" href={whatsappOrderLink(product.name, currentPrice, selected[0])} target="_blank" rel="noreferrer">WhatsApp ↗</a>
          <button
            className="add-cart"
            type="button"
            aria-label={inCart ? `Go to cart with ${product.name}` : `Add ${product.name} to cart`}
            onClick={() => {
              if (inCart) {
                openCart();
                return;
              }
              addToCart({ ...product, price: currentPrice, weight: selected[0], variantId: product.variants?.find((variant) => variant.label === selected[0])?._id });
            }}
          >
            {inCart ? "Go to Cart" : "Add to Cart"}
          </button>
        </div>
      </div>
    </article>
  );
}
