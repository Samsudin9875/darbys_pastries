# Darby's Pastries

React + Vite frontend and Express production server for Darby's Pastries.

## Run locally

```bash
npm install
npm run dev
```

- `npm run dev` starts both the frontend and API.
- Frontend: `http://localhost:5173`
- API health check: `http://localhost:3000/api/health`
- To run only one service, use `npm run dev:client` or `npm run dev:server`.

## Production

The frontend is configured for Vercel (`vercel.json`) and the API for Render. Configure `VITE_API_URL` (the deployed API base ending in `/api`) and a production `VITE_CLERK_PUBLISHABLE_KEY` in Vercel before deploying. On Render, set `NODE_ENV=production`, `CLIENT_ORIGINS` to the exact frontend origin, and the server variables listed in `server/.env.example`. See [docs/deployment.md](./docs/deployment.md) for the full setup.

Never commit API secrets. Cloudinary upload credentials belong only in server-side environment variables.
