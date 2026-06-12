# Arise — Deploy & install

Adapted from Shift + Lift's Route A, with two Arise-specific differences: the router
needs an SPA redirect (configured in `netlify.toml`), and sync needs the Supabase env
vars **at build time** (Vite inlines them).

## Route A — Netlify (recommended)

### A1. Git-linked (best: push = deploy)

1. https://app.netlify.com → **Add new site → Import an existing project** → pick
   `KaranAnchan/arise`. `netlify.toml` supplies the build command and SPA redirect.
2. Site settings → **Environment variables** → add
   `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (skip to ship local-only).
3. Deploy. You get `https://<name>.netlify.app`.
4. In Supabase: **Auth → URL Configuration** → add the deployed URL to Site URL /
   redirect URLs (else OAuth/magic-link redirects bounce).

### A2. Netlify Drop (no account linking, ~2 min)

1. Locally: ensure `.env` is filled (the build inlines it), then `npm run build`.
2. Drag `dist/` onto https://app.netlify.com/drop.
3. Caveat: drop deploys don't read `netlify.toml` from the repo — deep links may 404.
   Mitigation: `dist/_redirects` is emitted by the build (see `public/_redirects`).

Cloudflare Pages / Vercel are equivalent: build `npm run build`, output `dist`,
SPA fallback to `/index.html`, same env vars.

## Install on phone

- **Android (Chrome):** open the URL → Install banner, or ⋮ → *Add to Home screen →
  Install*. Fullscreen, offline, in the launcher.
- **iPhone (Safari):** Share → *Add to Home Screen*.

Updates: push (A1) or re-upload (A2). The service worker prompts in-app:
`[THE SYSTEM HAS EVOLVED. RELOAD TO ASCEND.]`

## Post-deploy checklist

- [ ] App loads at the URL; dashboard renders
- [ ] Airplane mode → cold start still works (precached shell)
- [ ] `/settings` shows the Ascension panel (not "NO BACKEND") if env was set
- [ ] Sign-in round-trips (magic link lands back on the deployed origin)
- [ ] Phone + desktop linked to the same account converge after a logged set
- [ ] Lighthouse PWA: installable, no console errors
