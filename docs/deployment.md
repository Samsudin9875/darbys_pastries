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

Set `NODE_ENV=production` plus every variable in `server/.env.example`. `PORT` is supplied by Render. Set `CLIENT_ORIGINS` to the exact Vercel frontend origin or origins, comma-separated; do not include a trailing slash.

## External configuration

Configure the Vercel URL in Clerk's allowed origins/redirect settings. Use a MongoDB Atlas connection string for `MONGODB_URI` and the Cloudinary credentials for the selected Cloudinary account.
