# Minimal Black-and-White Tech Landing Page

Static React + Vite landing page with Inter font, built for GitHub Pages.

## Local dev
```bash
pnpm install
pnpm run dev
```

## Build
```bash
pnpm run build
pnpm run preview
```

## Deploy to GitHub Pages
1. Push to `main`.
2. In GitHub: Settings → Pages → Build and deployment → Source: GitHub Actions.
3. The workflow at `.github/workflows/deploy.yml` publishes `dist/`.

Notes:
- `vite.config.ts` sets `base: './'` so assets resolve correctly on Pages.
