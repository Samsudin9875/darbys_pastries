# Deployment configuration

## Vercel (frontend)

Import this repository with the project root unchanged. Vercel uses `vercel.json` to build `client/dist` and route every SPA path to `index.html`.

Set these environment variables:

- `VITE_API_URL` — the public Render API URL ending in `/api`
- `VITE_CLERK_PUBLISHABLE_KEY`

## Render (backend)

Create a Node web service from this repository with these settings:

- Build command: `npm ci --include=dev`
- Start command: `npm run start --workspace=server`
- Health check path: `/api/`

Set `NODE_ENV=production` plus every variable in `server/.env.example`. `PORT` is supplied by Render. Set `CLIENT_ORIGINS` to the exact Vercel frontend origin or origins, comma-separated; do not include a trailing slash. If admins use Vercel preview URLs, append `https://*.vercel.app` (for example: `https://shop.example.com,https://*.vercel.app`).

## External configuration

Configure the Vercel URL in Clerk's allowed origins/redirect settings. Use a MongoDB Atlas connection string for `MONGODB_URI` and the Cloudinary credentials for the selected Cloudinary account.

## Product taxonomy migration

Run the migration from the repository root. Start with a read-only dry run:

```powershell
node server/src/scripts/migrate-product-taxonomy.mjs
```

Apply only after reviewing the product mappings. The apply command creates and verifies a complete EJSON snapshot of the products collection in the ignored `server/backups/` directory before changing taxonomy fields. Confirm the exact database name; use `--allow-unclassified` only when unresolved products should remain available for later manual classification. Production databases also require `--confirm-production`.

```powershell
node server/src/scripts/migrate-product-taxonomy.mjs --apply --confirm-db=<database-name> --allow-unclassified
```

To roll back only the taxonomy fields from that snapshot, pass its filename and confirm the same database. Product IDs, images, prices, variants, stock, and orders are not replaced by the rollback.

```powershell
node server/src/scripts/rollback-product-taxonomy.mjs <backup-filename> --confirm-db=<database-name>
```

The catalogue API accepts composable `mainCategory` (comma-separated for multiple categories), `cakeSubcategory` (including `custom` for Admin-assigned Custom Cake products), `occasion`, `theme`, `search`, `featured`, `minPrice`, `maxPrice`, `sort` (`name`, `price-asc`, or `price-desc`), and `available` filters. The Cakes navbar's Custom Cake item opens the existing custom-order form; it is not one of the six homepage cake cards. Results are paginated with `page` and `limit` (maximum 50); the response includes `pagination`. `/api/products/facets` returns themes currently assigned to published cake products. Product details are available at `/api/products/:id` (MongoDB ID or slug). Admin product deletion permanently removes the product from the catalogue after confirmation. Order records remain unchanged; variants referenced by existing orders are retained, and unshared Cloudinary images are removed when possible.

The homepage uses published MongoDB products for Best Sellers and add-on product cards. Admins can choose Best Sellers per product, select up to two featured add-on products per store category, control homepage section visibility, and edit the theme choices and up to three homepage review highlights. These homepage settings are stored in the `homepage` SiteSetting document; product taxonomy and existing order data are not migrated by these homepage changes.

Cake product variants support 500 g, 1 kg, 1.5 kg, 2 kg, 2.5 kg, and 3 kg. Admins enter a separate price for each configured size when adding or editing a cake; the storefront size dropdown only shows sizes with an active, in-stock variant. Existing products keep their current variant prices until an admin adds or updates sizes.
