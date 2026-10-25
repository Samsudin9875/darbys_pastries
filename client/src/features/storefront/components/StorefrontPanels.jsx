import { useEffect, useRef, useState } from "react";
import { useClerk, useUser } from "@clerk/react";

import { getImageFor } from "../../menu/data/menuData";
import { rupees } from "../../../utils/storefrontUtils";
import { asset } from "../../../utils/storefrontUtils";

function StorefrontPanels({
  panel,
  setPanel,
  cart,
  cartCount,
  wishlist,
  wishlistCount,
  setWishlist,
  cartTotal,
  updateCartQuantity,
  addToCart,
  buildOrderCartLink,
  placeCartOrder,
  user,
  signOut,
  clerkEnabled,
}) {
  const [checkout, setCheckout] = useState({ name: "", phone: "", deliveryType: "Home Delivery", address: "", pincode: "" });
  const [checkoutStatus, setCheckoutStatus] = useState("");
  const submitOrder = async () => { try { setCheckoutStatus("Saving order…"); const result = await placeCartOrder(checkout); setCheckoutStatus(`Order ${result.order.orderId} saved. Opening WhatsApp…`); window.open(result.whatsappUrl, "_blank", "noopener"); } catch (error) { setCheckoutStatus(error.message); } };
  const previousFocus = useRef(null);

  useEffect(() => {
    if (!panel) {
      previousFocus.current?.focus();
      return undefined;
    }

    previousFocus.current = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.body.classList.add("panel-open");

    const closeOnEscape = (event) => {
      if (event.key === "Escape") setPanel("");
    };

    document.addEventListener("keydown", closeOnEscape);
    document.querySelector(`[data-storefront-panel="${panel}"] .panel-close`)?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.classList.remove("panel-open");
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [panel, setPanel]);

  const closePanel = () => setPanel("");
  const startShopping = () => {
    closePanel();
    document.getElementById("menu")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const goHome = () => {
    closePanel();
    window.location.assign("/");
  };

  return (
    <>
      <div
        className={`panel-backdrop ${panel ? "open" : ""}`}
        aria-hidden="true"
        onClick={closePanel}
      />

      <aside
        className={`side-panel ${panel === "cart" ? "open" : ""}`}
        data-storefront-panel="cart"
        role="dialog"
        aria-modal={panel === "cart"}
        aria-labelledby="cartPanelTitle"
        aria-hidden={panel !== "cart"}
        inert={panel !== "cart"}
      >
        <div className="panel-header">
          <button className="panel-brand-home" type="button" onClick={goHome} aria-label="Go to Darby's Pastries home"><img src={asset("9ce04fb5e8b4.png")} alt="" /><span>Darby's<br />Pastries</span></button>
          <div className="panel-heading">
            <span className="panel-kicker">ORDER OVERVIEW</span>
            <h2 id="cartPanelTitle">Your Cart <span className="panel-count">{cartCount} {cartCount === 1 ? "item" : "items"}</span></h2>
          </div>
          <button className="panel-close" type="button" aria-label="Close cart" onClick={closePanel}>×</button>
        </div>
        <div className="panel-scroll">
          {cart.length ? (
            <>
              <div className="cart-list">
                {cart.map((item) => (
                  <article className="cart-item" key={`${item.name}-${item.weight}-${item.category}`}>
                    <img src={item.image || getImageFor(item.name, item.category).src} alt={item.imageAlt || item.name} />
                    <div>
                      <h3>{item.name}</h3>
                      <div className="cart-meta">{item.weight} · {rupees(item.price)} each</div>
                      <div className="quantity-control">
                        <button type="button" aria-label={`Decrease ${item.name} quantity`} onClick={() => updateCartQuantity(item, -1)}>−</button>
                        <span>{item.quantity}</span>
                        <button type="button" aria-label={`Increase ${item.name} quantity`} onClick={() => updateCartQuantity(item, 1)}>+</button>
                      </div>
                      <button className="cart-remove" type="button" onClick={() => updateCartQuantity(item, -item.quantity)}>Remove</button>
                    </div>
                    <div className="cart-line-price">{rupees(item.price * item.quantity)}</div>
                  </article>
                ))}
              </div>
              <div className="cart-summary">
                <div className="cart-total"><span>Total</span><strong>{rupees(cartTotal)}</strong></div>
                <div className="cart-checkout-head"><span>Guest checkout</span><p>No login required. We will save your request before opening WhatsApp.</p></div>
                <div className="cart-checkout-grid">
                  <label><span>Full name</span><input className="cart-checkout-input" value={checkout.name} onChange={(e) => setCheckout({ ...checkout, name: e.target.value })} placeholder="Enter your name" maxLength="120" autoComplete="name" /></label>
                  <label><span>WhatsApp number</span><input className="cart-checkout-input" value={checkout.phone} onChange={(e) => setCheckout({ ...checkout, phone: e.target.value })} placeholder="10-digit mobile number" inputMode="tel" maxLength="14" autoComplete="tel" /></label>
                </div>
                <fieldset className="cart-delivery-choice"><legend>How would you like to receive your order?</legend><label><input type="radio" name="cartDeliveryType" checked={checkout.deliveryType === "Home Delivery"} onChange={() => setCheckout({ ...checkout, deliveryType: "Home Delivery" })} /> Home delivery</label><label><input type="radio" name="cartDeliveryType" checked={checkout.deliveryType === "Store Pickup"} onChange={() => setCheckout({ ...checkout, deliveryType: "Store Pickup" })} /> Store pickup</label></fieldset>
                {checkout.deliveryType === "Home Delivery" && <div className="cart-checkout-grid"><label className="cart-checkout-wide"><span>Delivery address</span><textarea className="cart-checkout-input" value={checkout.address} onChange={(e) => setCheckout({ ...checkout, address: e.target.value })} placeholder="House / flat, street, area and landmark" maxLength="500" autoComplete="street-address" /></label><label><span>Pincode</span><input className="cart-checkout-input" value={checkout.pincode} onChange={(e) => setCheckout({ ...checkout, pincode: e.target.value.replace(/\D/g, "") })} placeholder="6-digit pincode" inputMode="numeric" maxLength="6" autoComplete="postal-code" /></label></div>}
                <button type="button" className="btn btn-primary" onClick={submitOrder}>Save request &amp; continue to WhatsApp</button>
                {checkoutStatus && <p className="cart-note" role="status">{checkoutStatus}</p>}
                <p className="cart-note">Final availability, delivery charge and pickup/delivery timing are confirmed by the bakery on WhatsApp.</p>
              </div>
            </>
          ) : (
            <div className="cart-empty">
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3 4h2l2.1 10.1a2 2 0 0 0 2 1.6h7.8a2 2 0 0 0 2-1.6L20 8H6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/><circle cx="10" cy="20" r="1.3" fill="currentColor"/><circle cx="17" cy="20" r="1.3" fill="currentColor"/></svg>
              <h3>Your cart is empty</h3>
              <p>Add a cake or bakery extra from the menu to see it here.</p>
              <button className="btn btn-primary" type="button" onClick={startShopping}>Start Shopping</button>
            </div>
          )}
        </div>
      </aside>

      <aside
        className={`side-panel ${panel === "wishlist" ? "open" : ""}`}
        data-storefront-panel="wishlist"
        role="dialog"
        aria-modal={panel === "wishlist"}
        aria-labelledby="wishlistPanelTitle"
        aria-hidden={panel !== "wishlist"}
        inert={panel !== "wishlist"}
      >
        <div className="panel-header">
          <button className="panel-brand-home" type="button" onClick={goHome} aria-label="Go to Darby's Pastries home"><img src={asset("9ce04fb5e8b4.png")} alt="" /><span>Darby's<br />Pastries</span></button>
          <div className="panel-heading">
            <span className="panel-kicker">SAVED FOR LATER</span>
            <h2 id="wishlistPanelTitle">Your Wishlist <span className="panel-count">{wishlistCount} {wishlistCount === 1 ? "item" : "items"}</span></h2>
          </div>
          <button className="panel-close" type="button" aria-label="Close wishlist" onClick={closePanel}>×</button>
        </div>
        <div className="panel-scroll">
          {wishlist.length ? (
            <div className="wishlist-list">
              {wishlist.map((item) => (
                <article className="cart-item" key={`${item.name}-${item.category}`}>
                  <img src={item.image || getImageFor(item.name, item.category).src} alt={item.imageAlt || item.name} />
                  <div>
                    <h3>{item.name}</h3>
                    <div className="cart-meta">{item.weight} · {rupees(item.price)}</div>
                    <div className="wishlist-actions">
                      <button className="wishlist-add" type="button" onClick={() => addToCart(item)}>Add to Cart</button>
                      <button className="wishlist-remove" type="button" onClick={() => setWishlist((current) => current.filter((entry) => !(entry.name === item.name && entry.category === item.category)))}>Remove</button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="cart-empty">
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M20.8 4.7a5.5 5.5 0 0 0-7.8 0L12 5.8l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.5a5.5 5.5 0 0 0 0-7.8Z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>
              <h3>Your wishlist is empty</h3>
              <p>Tap the heart on a cake card to keep it here while you browse.</p>
              <button className="btn btn-primary" type="button" onClick={startShopping}>Browse the menu</button>
            </div>
          )}
        </div>
      </aside>

      <aside
        className={`side-panel ${panel === "account" ? "open" : ""}`}
        data-storefront-panel="account"
        role="dialog"
        aria-modal={panel === "account"}
        aria-labelledby="accountPanelTitle"
        aria-hidden={panel !== "account"}
        inert={panel !== "account"}
      >
        <div className="panel-header">
          <button className="panel-brand-home" type="button" onClick={goHome} aria-label="Go to Darby's Pastries home"><img src={asset("9ce04fb5e8b4.png")} alt="" /><span>Darby's<br />Pastries</span></button>
          <div className="panel-heading">
            <span className="panel-kicker">CUSTOMER PROFILE</span>
            <h2 id="accountPanelTitle">My Account</h2>
          </div>
          <button className="panel-close" type="button" aria-label="Close account" onClick={closePanel}>×</button>
        </div>
        <div className="panel-scroll">
          <div className={`account-layout ${user ? "" : "account-guest"}`}>
            <div>
              <section className="profile-card" aria-labelledby="previewProfileTitle">
                <h3 id="previewProfileTitle">Profile</h3>
                <dl className="profile-details">
                  <div><dt>Name</dt><dd>{user?.fullName || "Guest customer"}</dd></div>
                  <div><dt>Email</dt><dd>{user?.primaryEmailAddress?.emailAddress || "Not provided"}</dd></div>
                  <div><dt>Phone</dt><dd>Not provided</dd></div>
                </dl>
              </section>
                {!user && clerkEnabled && <>
                  <p className="account-preview-note">Guest browsing · No account required</p>
                  <div className="account-auth-actions">
                    <button className="btn btn-primary" type="button" onClick={() => window.location.assign("/sign-in")}>Log In</button>
                    <button className="btn btn-secondary" type="button" onClick={() => window.location.assign("/sign-up")}>Sign Up</button>
                  </div>
                </>}
                {!user && !clerkEnabled && <p className="account-preview-note">Guest browsing · No account required</p>}
                {user && <>
                  <p className="account-preview-note">You are signed in.</p>
                </>}
              <div className="account-menu" aria-label="Account overview">
                <div className="account-row" aria-disabled="true"><span className="account-row-icon"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 7h14v13H5zM8 4h8l2 3H6l2-3Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/><path d="M9 11a3 3 0 0 0 6 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg></span><span><strong>My Orders</strong><small>0 orders placed</small></span><span className="chevron">›</span></div>
                <div className="account-row" aria-disabled="true"><span className="account-row-icon"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="2"/><path d="M9 12h6M12 9v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg></span><span><strong>Loyalty Coins</strong><small>Available balance: 0 coins</small></span><span className="chevron">›</span></div>
                <div className="account-row" aria-disabled="true"><span className="account-row-icon"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" stroke="currentColor" strokeWidth="2"/><circle cx="12" cy="10" r="2.5" stroke="currentColor" strokeWidth="2"/></svg></span><span><strong>Saved Addresses</strong><small>0 addresses saved</small></span><span className="chevron">›</span></div>
                {!user && <div className="account-row logout" aria-disabled="true"><span className="account-row-icon"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M10 5H5v14h5M14 8l4 4-4 4m4-4H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg></span><span><strong>Log Out</strong><small>No active account session</small></span><span className="chevron">›</span></div>}
              </div>
              {user && <button className="btn btn-secondary account-logout-button" type="button" onClick={() => signOut({ redirectUrl: "/" })}>Log Out</button>}
            </div>
            <section className="account-content" aria-labelledby="previewEmptyOrdersTitle">
              <svg className="account-empty-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 7h14v13H5zM8 4h8l2 3H6l2-3Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/><path d="M9 11a3 3 0 0 0 6 0" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg>
              <h3 id="previewEmptyOrdersTitle">No Orders Found</h3>
              <p>Your orders will appear here after you place them. Browse the menu to find a cake for your next celebration.</p>
              <button className="btn btn-primary" type="button" onClick={startShopping}>Start Shopping</button>
            </section>
          </div>
        </div>
      </aside>
    </>
  );
}

function ClerkStorefrontPanels(props) {
  const { signOut } = useClerk();
  const { user } = useUser();
  return <StorefrontPanels {...props} user={user} signOut={signOut} clerkEnabled />;
}

export default function StorefrontPanelsWithAuth(props) {
  if (!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY) {
    return <StorefrontPanels {...props} user={null} signOut={() => Promise.resolve()} clerkEnabled={false} />;
  }
  return <ClerkStorefrontPanels {...props} />;
}
