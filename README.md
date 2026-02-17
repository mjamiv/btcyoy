# Bitcoin Time Machine (btcyoy)

An interactive, zero-build Bitcoin historical price tracker showing BTC's price on today's date for every year since 2011. Built with a retro BBS/ASCII terminal aesthetic.

**Live**: https://mjamiv.github.io/btcyoy/

## Features

- **ANSI Blockchain Blocks** — ASCII art timeline showing price on this day each year, newest first
- **Interactive Chart** — Chart.js line graph with logarithmic/linear scale toggle
- **Historical Data Table** — Date, BTC/USD, Genesis Return, 5-Year CAGR per year
- **My Genesis** — Pick your personal Bitcoin purchase date and see returns vs. every year
- **Live Price** — Current BTC price from CoinGecko API, highlighted with `[LIVE]` tag
- **One-Click Refresh** — Manual live-price refresh button + background auto-refresh
- **Remembered Preferences** — Persists chart scale and My Genesis date in local storage
- **Responsive** — Mobile-optimized with horizontal scroll blocks and adaptive font sizing

## Running the App

No build step required. Use any static file server:

```
python3 -m http.server 8000
# then visit http://localhost:8000
```

Dependencies load via CDN (Chart.js 4.5.1, IBM Plex Mono font). App CSS/JS are local files in `assets/`. Data is read from the local `btc-historical-price` CSV file.

## Project Structure

```
index.html              # App shell and semantic layout
assets/css/app.css      # BBS terminal theme + utility classes
assets/js/app.js        # Runtime logic (data load, rendering, interactions)
btc-historical-price    # Historical BTC price CSV (Date,Price)
robots.txt              # Search engine directives
sitemap.xml             # Sitemap for SEO
CLAUDE.md               # AI development instructions
.github/workflows/      # GitHub Actions (deploy, Claude Code, code review)
```

## Security & Production Hardening

- CDN dependencies pinned to exact versions with Subresource Integrity (SRI) hashes
- Strict Content Security Policy (CSP) without `unsafe-inline`
- Additional hardening headers via meta: Referrer-Policy + Permissions-Policy
- Removed inline event handlers/styles in favor of JS event listeners + CSS classes
- CoinGecko API response validated for shape, type, and finite values
- CSV parser validates date format (MM/DD/YYYY) and rejects invalid prices
- Fetch requests use AbortController timeouts (10s API, 5s CSV)
- All division operations guarded against zero denominators
- Graceful fallback to sample data with visible `[NOTICE]` banner

## Accessibility

- WCAG 2.1 AA color contrast compliance (`--text-dim` at 4.6:1 ratio)
- Skip-nav link, `<main>` landmark, semantic `<h2>` headings, `aria-label` on sections
- `aria-live="polite"` for live price updates, `aria-pressed` on scale toggle
- `prefers-reduced-motion` support (disables all animations)
- `prefers-contrast: more` support (removes CRT scanline overlay)
- `focus-visible` styles on all interactive elements

## SEO

- Meta description, Open Graph, and Twitter Card tags
- Schema.org JSON-LD structured data (WebApplication)
- Canonical URL, theme-color, inline SVG favicon
- Semantic HTML with proper heading hierarchy
