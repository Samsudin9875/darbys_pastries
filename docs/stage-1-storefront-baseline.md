# Stage 1: Legacy Storefront Baseline

Date: 2026-09-30  
Scope: documentation only. The active `/` route and legacy runtime were not changed.

## Active architecture and routes

| URL | Active implementation | Behaviour |
| --- | --- | --- |
| `/` | `client/src/App.jsx` -> `LegacySitePage.jsx` | Renders `/legacy/index.html` in an iframe. |
| `/legacy` | React Router redirect | Redirects to `/`. |
| Any other client route | `NotFoundPage.jsx` | React 404 screen. |
| `/api/health` | Express | Returns service status JSON. |

The Vite-served legacy runtime is `client/public/legacy/index.html`, `site.css`, `site.js`, and 36 local image assets. `client/legacy` is an identical source copy. `client/dist` is generated output and must never be edited.

## Legacy sections and components

1. Header: logo, delivery metadata, desktop/mobile search, Admin/Wishlist/Cart/Account controls, mobile menu.
2. Main navigation: Home, Cakes, Occasions, Custom Cakes, Flowers, Chocolates, Offers, Contact; mega-menu links apply catalogue filters or scroll to sections.
3. Hero: headline, two CTAs, delivery/quality notes, three-image gallery, price badge.
4. USP ticker/cards and shop-by-category cards.
5. Product catalogue: ten categories, filters, search, price/weight selector, product image/credit, wishlist and add-to-cart controls.
6. Custom cake builder: five-step form, live price/advance estimate, optional reference preview, WhatsApp handoff.
7. Informational content: gallery, about/founder, reviews, ordering/contact/FAQ, newsletter, footer and WhatsApp floating button.
8. Drawers/dialogs: wishlist, cart, account, footer-resource content, mobile navigation, admin preview, add-product modal.
9. Admin preview: local-only hero/nav/product editing UI and placeholder views for orders, custom requests, delivery, coupons, reviews, inventory, customers, and settings.

## Visual system baseline

### Tokens

| Token | Value |
| --- | --- |
| Background/surfaces | `#ffffff` |
| Ink | `#202124` |
| Muted text | `#626870` |
| Brand red | `#c6283c` |
| Dark brand red | `#9f1f31` |
| Accent/outline | `#c7ccd3` |
| Divider | `#e5e7eb` |
| Shadow | `0 24px 70px rgba(24, 30, 39, .09)` |
| Radii | 12px / 22px / 38px |
| Horizontal gutter | `clamp(18px, 1.75vw, 28px)` |

Typography is Poppins for interface/body copy and Playfair Display for display headings. Headings use responsive `clamp()` sizing; body is white even when system dark mode is requested.

### Responsive baseline

- Desktop layout targets 901px and above.
- At 900px and below: header/menu/drawers/admin layouts reflow for tablet and mobile.
- At 640px and below: compact mobile controls, single-column forms/cards, reduced admin navigation.
- Additional catalogue/custom-builder refinements exist around 1100px, 900px, and 640px.
- Reduced-motion users receive no reveal/transition animation.

## Catalogue, search, wishlist, and cart

### Catalogue data

Categories: Classic, Premium, Special, Mix Flavour, Cheesecake, Desserts, Photo Cakes, Custom Cakes, Flowers, Chocolates.

Legacy pricing supports 500 g and 1 kg cake prices. Desserts, flowers, and chocolates are unit-priced. Product data and image mapping are currently hard-coded in `client/public/legacy/site.js`.

### Behaviour

- Initial view is best-selling cakes; category tabs, mega-menu/category cards, and search change the visible list.
- Search matches product name, category label/category key, and subcategory.
- Filters include bestseller, category, subcategory, individual product, chocolate, fruit, eggless, 500 g, and 1 kg.
- Cake cards permit active weight selection before WhatsApp/add-to-cart. Unit products display one price.
- Wishlist toggles products in memory only. It is not persisted after refresh.
- Cart groups products by `name|weight`; add increments quantity. Drawer supports increment, decrement, remove, listed total, and WhatsApp order summary.
- Checkout opens WhatsApp; it does not create an API order, payment, or database record.

## Asset baseline

`client/public/legacy/images` contains 36 assets: 33 JPG, 2 WebP, 1 PNG; total size is approximately 9.66 MB.

Image selection is centralised in legacy `chocolateImages`, `productImages`, and `menuImageFor` mappings. Examples:

| Use | Asset |
| --- | --- |
| Brand mark | `legacy-9ce04fb5e8b4.png` |
| Hero/main chocolate cake | `legacy-101920fbaa29.jpg` |
| Birthday/Black Forest | `legacy-9c4c74910c48.jpg` |
| Designer/Rasmalai | `legacy-2a95b9ea83e2.jpg` |
| Photo cake | `legacy-21fb311aaaed.jpg` |
| Fallback menu image | `legacy-310489841a2a.jpg` |

Migration must keep existing paths and dimensions until Cloudinary is separately approved/configured.

## Custom cake builder baseline

### Steps and fields

1. Occasion: Birthday, Anniversary, Wedding, Baby Shower, Photo Cake, Corporate, Other; theme/colour palette is optional.
2. Cake: flavour, weight (0.5/1/1.5/2/3/5 kg), shape (Round, Square +₹50, Heart +₹100, Tier +₹700).
3. Design: eggless (+₹50), fondant (+₹150/kg), detailed design cutting (+20%), party add-ons (candle set +₹20, knife +₹10, sparkler +₹30), message, optional PNG/JPEG/WebP reference photo up to 8 MB.
4. Delivery: required date, required time slot, required customer name, required phone pattern, optional alternate phone, required address, optional landmark/pincode.
5. Advance/review: 50% calculated advance, optional UPI reference, required order-details confirmation.

### Validation and estimate

- Continue validates only required fields in the active step.
- Delivery date minimum is the current local date.
- Estimate = flavour rate × weight + shape + eggless + fondant + add-ons; detailed-cutting adds 20% after flavour/shape/eggless/fondant charges.
- Submit validates all required fields, switches to an invalid step when necessary, and does not upload the reference image. The user is asked to attach it manually in WhatsApp.

### WhatsApp message baseline

The generated request includes customer name, phone and alternate phone, delivery date/time, delivery address/landmark, occasion, flavour/weight, shape, eggless/fondant, add-ons, cake message, reference-photo status, total estimate, advance paid/UPI reference, and a note that delivery/final availability are confirmed over WhatsApp.

## Footer, dialogs, and admin preview

- Footer links either scroll, open WhatsApp, or open in-page resource dialogs (blog, ordering, delivery, policy, social placeholders).
- Newsletter opens WhatsApp with the entered email; no subscription API exists.
- Account drawer is display-only “Guest shopper”; there is no authentication.
- Admin is explicitly a preview: product/hero/navigation changes are in-memory and reset after refresh. File inputs only create local previews. No role check, data persistence, or API call exists.

## Backend baseline

Express serves the built frontend and exposes only `GET /api/health`. There are no API contracts for products, customers, authentication, cart, order, payment, database, Cloudinary, or uploads. Stage 2 must not invent or add these contracts.

## Stage 2 migration checklist

The preview route will be built first; `/` remains legacy until every item below is accepted.

- [ ] Extract immutable menu/image/config data into React modules without changing values.
- [ ] Port header, responsive navigation, hero, ticker, category cards, and static sections using the existing CSS/classes.
- [ ] Port catalogue search, all filters, weight selection, and image-credit behaviour.
- [ ] Port wishlist/cart drawers and exact WhatsApp messages; keep memory-only state initially.
- [ ] Port the complete five-step custom builder, including validation and exact price logic/message fields.
- [ ] Port footer dialogs, newsletter, account placeholder, and admin preview semantics.
- [ ] Compare desktop/tablet/mobile against this baseline and test all interactions on a preview route.
- [ ] Run lint/build and only then request approval to switch `/`.
- [ ] Remove unused legacy/runtime code only after the switched route passes acceptance.

