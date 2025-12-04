# UNI Med Solutions Frontend

A React + Vite (TypeScript) frontend using Bootstrap, React Router, and Axios. It is set up to call your microservices through an API gateway.

## Dev proxy to gateway

- Dev server proxies `/api/*` to `VITE_API_BASE_URL`.
- Default dev value is `http://localhost:8085` (see `.env.development`).
- Change it as needed to point at your gateway.

## Scripts

- `npm install` — install dependencies
- `npm run dev` — start dev server (http://localhost:5173)
- `npm run build` — build for production
- `npm run preview` — preview the build locally

## API calls

Use the shared Axios instance at `src/lib/api.ts`. It uses base URL `/api` so dev requests are proxied to the gateway and production can work behind the same origin (or you can set up your reverse proxy/CDN accordingly).

## Structure

- `src/main.tsx` — app entry
- `src/App.tsx` — routing and layout
- `src/components/Navbar.tsx` — Bootstrap-based navbar
- `src/pages/Home.tsx` — landing page
- `src/pages/ApiExplorer.tsx` — simple tool to test gateway endpoints
- `src/lib/api.ts` — Axios client
- `src/styles/global.scss` — global styles
