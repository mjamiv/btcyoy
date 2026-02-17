# Bitcoin Time Machine (`btcyoy`)

An interactive, zero-build Bitcoin historical price tracker with a retro BBS/ASCII terminal aesthetic.
It shows BTC price on the current month/day across years, then overlays current live price data for this year.

Live site: https://mjamiv.github.io/btcyoy/

## Highlights

- ANSI-style timeline blocks (newest year first)
- Chart.js line chart with logarithmic/linear scale toggle
- Historical table with:
  - BTC/USD
  - Return since first available year in the current series
  - 5-year CAGR
  - Optional "My Genesis Return" column
- Personal "My Genesis" date analysis (with nearest-date fallback up to 7 days)
- Live BTC price from CoinGecko with:
  - `[LIVE]` indicator
  - Manual refresh button
  - Background auto-refresh
  - Last-updated timestamp
- Preference persistence in `localStorage` (chart scale + My Genesis date)

## Quick Start

No build step required. Serve as static files:

```bash
python3 -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

## Stack

- HTML shell: `index.html`
- App styles: `assets/css/app.css`
- App runtime: `assets/js/app.js`
- Historical dataset: `btc-historical-price` (`Date,Price`)
- External dependencies:
  - Chart.js `4.5.1` (CDN + SRI)
  - IBM Plex Mono (Google Fonts)

## Data Flow

1. Load CSV data (tries multiple filenames, falls back to embedded sample data).
2. Parse and validate rows (`MM/DD/YYYY`, finite non-negative prices).
3. Filter rows to today's month/day across all years.
4. Compute metrics (genesis return and 5-year CAGR).
5. Render timeline, chart, and table.
6. Fetch live price and inject/update current year.

## Security

- Strict CSP in `index.html`:
  - No `unsafe-inline`
  - Script allowlist includes self, Chart.js CDN, and a hash for JSON-LD block
- Additional response-hardening meta policies:
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- No inline event handlers; all interaction is attached through JS listeners
- API and CSV payload validation
- Request timeouts via `AbortController`

## Accessibility

- Semantic landmarks (`<main>`, `<header>`, `<footer>`)
- Skip link to data section
- `aria-live` updates for live-price/status regions
- `aria-pressed` on scale toggle buttons
- `focus-visible` keyboard styles
- `prefers-reduced-motion` and `prefers-contrast` support

## Performance

- Zero build and minimal runtime dependencies
- Removed browser Tailwind runtime dependency
- Chart updates in-place instead of destroy/recreate on each change
- Auto-refresh runs only when tab is visible

## Repository Layout

```text
index.html               # App shell, metadata, CSP, semantic structure
assets/css/app.css       # Theme + responsive styles + utility classes
assets/js/app.js         # Data loading, rendering, events, persistence
btc-historical-price     # Historical BTC CSV (Date,Price)
robots.txt               # Search engine directives
sitemap.xml              # Sitemap for SEO
.github/workflows/       # Deploy + automation workflows
```
