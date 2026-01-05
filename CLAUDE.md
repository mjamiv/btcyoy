# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A zero-build, single-page web application that displays Bitcoin's historical price on today's date across all years since the genesis block (January 3, 2009). The app features a BBS/ASCII terminal aesthetic with a calculator-first landing page that reveals historical data (ANSI-style blockchain blocks, price chart, and data table) after user interaction.

**Live URL**: https://mjamiv.github.io/btcyoy/

**Design Theme**: BBS/ASCII Terminal
- Retro terminal aesthetic with IBM Plex Mono font
- Terminal green (`#00ff00`) color scheme
- CRT scanline effect overlay
- ASCII art logo and box-drawing characters
- Zero build step, single-file architecture

**User Flow:**
1. Page loads with investment calculator as landing page
2. User selects date and investment amount, clicks "Calculate Returns"
3. Results display: "On [date] I invested [$X] to purchase [Y] BTC"
4. Historical data sections reveal with ANSI-style blockchain blocks
5. Chart supports logarithmic/linear scale toggle

## Running the Application

No build step required. Simply open `index.html` in a browser:
- Local: `open index.html` (macOS) or double-click the file
- The app loads all dependencies via CDN (Tailwind CSS, Chart.js)
- Data is fetched from the `btc-historical-price` CSV file in the repo root

## Architecture

### Single-File Application
All HTML, CSS, and JavaScript are contained in `index.html`. The application:
1. Shows investment calculator as landing page (historical data hidden initially)
2. Loads historical BTC price data from CSV file in background (tries multiple filenames)
3. Fetches live BTC price from CoinGecko API (`https://api.coingecko.com/api/v3/simple/price`)
4. Filters data for today's month/day across all available years
5. On calculator submission, reveals three views:
   - **ANSI Blockchain blocks**: ASCII art blocks using Unicode box-drawing characters
   - **Chart.js line chart**: Toggleable logarithmic/linear scale showing price progression
   - **Data table**: Metrics including Return Since Genesis, 5-Year CAGR, Return Since Purchase

### Dependencies (CDN-loaded)
- **Tailwind CSS v4**: Loaded via browser bundle (`@tailwindcss/browser@4`)
- **Chart.js**: Latest version for price visualization
- **Google Fonts**: IBM Plex Mono (monospace terminal font)

### Page Structure
```
┌────────────────────────────────────────┐
│  ASCII Logo Header                     │ ← BBS Terminal aesthetic
│  "BITCOIN TIME MACHINE"                │
└────────────────────────────────────────┘
┌────────────────────────────────────────┐
│  Investment Calculator                 │ ← Always visible (landing page)
│  [CALC] Purchase Date | Amount         │
│  Results: "On [date] I invested..."    │
└────────────────────────────────────────┘
          ↓ (revealed after submission)
┌────────────────────────────────────────┐
│  [BLOCK] ANSI Blockchain Blocks        │
│  ███████████╗ ███████████╗             │ ← ANSI/ASCII art blocks
│  ██ JAN'25 ██ ██ JAN'24 ██             │   (inline-block, horizontal)
│  ██ $97,500██ ██ $44,172██             │
│  ███████████║ ███████████║             │
│  ╚══════════╝ ╚══════════╝             │
└────────────────────────────────────────┘
┌────────────────────────────────────────┐
│  [CHART] Price Chart (LOG/LINEAR)      │ ← Toggle between scales
│  Chart.js Line Graph                   │
└────────────────────────────────────────┘
┌────────────────────────────────────────┐
│  [DATA] Historical Data Table          │
└────────────────────────────────────────┘
```

### ANSI Block Display System
- **Inline-Block Layout**: Blocks are displayed as `inline-block` elements in horizontal scroll container
- **Unicode Box-Drawing**: Uses Unicode characters (╗, ║, ╚, ═, ██) for terminal aesthetic
- **Fixed-Width Structure**: Each block is exactly 27 characters wide (20 main + 7 trailing)
- **10-Line Block Format**:
  ```
  ███████████████████╗       (line 1: top border)
  ██               ██║       (line 2: empty)
  ██  JAN. 03 '26  ██║       (line 3: date)
  ██               ██║       (line 4: empty)
  ██   $ 97,500    ██║ ████╗ (line 5: price + connector)
  ██               ██║ ╚═══╝ (line 6: empty + connector)
  ██    +45.23     ██║       (line 7: change %)
  ██               ██║       (line 8: empty)
  ███████████████████║       (line 9: bottom border top)
  ╚══════════════════╝       (line 10: bottom border)
  ```
- **Inline Connectors**: Blocks connect horizontally via `████╗` and `╚═══╝` characters (7 chars)
- **Monospace Font**: Uses Menlo/Monaco/Consolas for proper character alignment
- **Responsive Sizing**: Font size adjusts from 11px (desktop) down to 8px (mobile)

### Initialization Flow
1. `init()` → Hide historical sections (`hideHistoricalSections()`)
2. Set max date for purchase date input to today
3. `loadData(true)` → Load and process data without rendering (skipRender flag)
4. `fetchCurrentPrice()` → Get live BTC price, add current year (2026) to dataset via `addCurrentYearToData()`
5. User interacts with calculator → `calculateReturns()` triggered
6. `showHistoricalSections()` → Reveal chart, blocks, table
7. `renderChart()` / `renderTimelineCards()` / `renderTable()` → Render views with current year included
8. User can toggle chart scale via `setChartScale()` (logarithmic/linear)

### Data Flow
- `parseCSV()` → Parse CSV into `{dateStr: price}` object, handles quoted fields and comma-separated numbers
- `filterTodayData()` → Extract entries matching current month/day from all years
- `fetchCurrentPrice()` → Get live BTC price from CoinGecko API
- `addCurrentYearToData()` → Add current year (2026) with live price to dataset
- `calculateMetrics()` → Compute returns, CAGR for each year (including current year)
- `renderChart()` → Create Chart.js instance with configurable scale type (logarithmic/linear)
- `renderTimelineCards()` → Generate ANSI-style blockchain blocks with inline connectors
- `setChartScale()` → Toggle between logarithmic and linear y-axis scales
- `renderTable()` → Display data table with optional purchase comparison, current year at top

### Key Functions
- **Date matching**: Uses `MM/DD/YYYY` format; filters by matching `todayMonth` and `todayDay`
- **CAGR calculation**: 5-year Compound Annual Growth Rate computed for years with 5+ years of history
- **Investment calculator**:
  - Converts USD amount to BTC at purchase date price
  - Calculates current value using latest price (live or most recent historical)
  - Displays: "On [date] I invested [$X] to purchase [Y] BTC"
  - Shows current value and total return percentage
- **ANSI block rendering** (`renderTimelineCards()`):
  - Creates 10-line ASCII art blocks using Unicode box-drawing characters
  - Uses `centerIn()` helper to center text within 15-character inner width
  - Inline connectors (`████╗` and `╚═══╝`) appear on lines 5-6 between blocks
  - Last block omits connectors (7 trailing spaces instead)
  - Color spans wrap content only, preserving character alignment
- **Chart scale toggle** (`setChartScale()`):
  - Switches between logarithmic and linear y-axis scales
  - Updates button active states
  - Re-renders chart with new scale type
  - Default: logarithmic scale
- **Section visibility**: `hideHistoricalSections()` / `showHistoricalSections()` control wrapper visibility
- **Fallback data**: If CSV files unavailable, uses embedded `sampleHistoricalData`
- **CSV loading**: Tries multiple filenames in sequence (URL-encoded and plain)
- **Number formatting**:
  - `formatCurrency()` → Standard format with 2 decimals for calculator results
  - `formatCurrencyTable()` → Whole numbers for table display ($91,267)
  - `formatPercent()` → Standard format with 2 decimals for calculator
  - `formatPercentTable()` → Whole numbers for table display (+304%)
- **Current year integration**:
  - Live price fetched from CoinGecko API
  - Current year (2026) automatically added to all visualizations
  - Special highlighting: `[LIVE]` indicator in table, orange background row
  - Pulse animation effect on current year blockchain card (terminal-pulse keyframes)

### ANSI Blockchain Block Design
Each block is rendered as ASCII art using Unicode box-drawing characters:

**Structure (10 lines × 27 characters):**
```
███████████████████╗
██               ██║
██  JAN. 03 '26  ██║
██               ██║
██   $ 97,500    ██║ ████╗
██               ██║ ╚═══╝
██    +45.23     ██║
██               ██║
███████████████████║
╚══════════════════╝
```

**Content:**
- **Line 3 (Date)**: Format `MON. DD 'YY` (e.g., "JAN. 03 '26") - amber color
- **Line 5 (Price)**: Format `$ 97,500` (whole numbers, commas) - white color
- **Line 7 (Change)**: Format `+45.23` or `-12.34` (percentage vs previous year) - green/red color
- **Lines 5-6 (Connectors)**: `████╗` (top) and `╚═══╝` (bottom) connect to next block

**Typography:**
- Font family: Menlo/Monaco/Consolas (for box-drawing character support)
- Base font size: 11px (desktop), 10px (tablet), 9px (mobile), 8px (phone)
- Line height: 1.2
- Letter spacing: 0 (monospace precision)
- Font features: `"tnum" 1` (tabular numbers)

**Color Scheme (CSS Variables):**
- `.ansi-block-date`: `--text-amber` (#ffb000)
- `.ansi-block-price`: `--text-white` (#e6e6e6)
- `.ansi-block-change-positive`: `--positive` (#00ff00)
- `.ansi-block-change-negative`: `--negative` (#ff3333)
- `.ansi-block-connector`: `--border-color` (#30363d)

**Current Year Highlighting:**
- Class: `.current-year`
- Color: `--btc-orange` (#f7931a)
- Animation: `terminal-pulse` (brightness 1.0 → 1.3 → 1.0, 2s infinite)

**Responsive Behavior:**
- Inline-block display with horizontal scrolling
- Font size scales down on smaller viewports
- Character alignment maintained across all screen sizes
- No repositioning logic needed (static inline layout)

## Data Files

The app attempts to load historical Bitcoin price data from multiple CSV file sources:

**File loading order** (tries each until successful):
1. `Bitcoin%20Historical%20Data_missing%20data.csv` (URL-encoded)
2. `Bitcoin Historical Data_missing data.csv` (plain)
3. `btc-historical-price.csv`
4. `btc-historical-price` (no extension)

**CSV Format:**
- Header: `Date,Price`
- Rows: `MM/DD/YYYY,price` (e.g., `01/03/2025,97500.00`)
- Prices may contain commas (e.g., `87,612.7`) - parser handles this
- Supports quoted fields for proper CSV parsing

**Fallback Data:**
- If no CSV file loads successfully, uses embedded `sampleHistoricalData`
- Sample data contains ~30 entries for demonstration purposes

## BBS Terminal Theme

The application uses a retro BBS/ASCII terminal aesthetic throughout:

### CSS Architecture (Custom Properties)
```css
:root {
    --bg-primary: #0a0a0a;          /* Pure black background */
    --bg-secondary: #0d1117;        /* Card backgrounds */
    --bg-card: #161b22;             /* Elevated elements */
    --text-primary: #00ff00;        /* Terminal green */
    --text-secondary: #33ff33;      /* Lighter green */
    --text-dim: #6e7681;            /* Muted text */
    --text-white: #e6e6e6;          /* White text */
    --text-amber: #ffb000;          /* Gold/amber accents */
    --text-cyan: #00ffff;           /* Cyan for headers */
    --btc-orange: #f7931a;          /* Bitcoin brand color */
    --positive: #00ff00;            /* Green for gains */
    --negative: #ff3333;            /* Red for losses */
    --border-color: #30363d;        /* Border color */
    --border-active: #00ff00;       /* Active/focus borders */
    --font-mono: 'IBM Plex Mono', 'Courier New', monospace;
}
```

### Key Visual Elements
1. **CRT Scanline Effect**: Repeating linear gradient overlay (2px scanlines, 20% opacity)
2. **ASCII Art Logo**: Multi-line Bitcoin logo using Unicode box-drawing characters
3. **Terminal Cards**: No rounded corners, solid borders, dark backgrounds
4. **Terminal Inputs**: Dark backgrounds with green glow on focus
5. **Terminal Buttons**: Transparent with BTC orange borders, fills on hover
6. **Section Headers**: Cyan colored with bracketed tags (e.g., `[CALC]`, `[BLOCK]`, `[CHART]`)
7. **Live Indicator**: Blinking `[LIVE]` tag using step-end animation

### Typography System
- **Primary Font**: IBM Plex Mono (loaded from Google Fonts)
- **Block Font**: Menlo/Monaco/Consolas (for box-drawing character support)
- **All text**: Monospace for consistency
- **No emoji**: Uses ASCII text tags instead (e.g., `[LIVE]` not 🔴)

### Chart.js Terminal Styling
- Square points (`pointStyle: 'rect'`)
- Angular lines (`tension: 0`)
- Terminal colors for tooltips (dark background, cyan/green text)
- Grid lines with dashed borders
- Monospace font for all chart labels

## Development Best Practices

When modifying this codebase:

1. **Preserve Terminal Aesthetic**:
   - Always use monospace fonts
   - Use CSS custom properties for colors (no hardcoded colors)
   - Maintain zero border-radius (no rounded corners)
   - Use bracketed tags `[TAG]` for section labels

2. **ANSI Block Rendering**:
   - Each block MUST be exactly 27 characters wide
   - Character alignment is critical - test on multiple browsers
   - Use Menlo/Monaco/Consolas fonts for box-drawing characters
   - Never add padding/margin that breaks alignment
   - Color spans should wrap content only, not structural characters

3. **Chart Integration**:
   - Chart scale type stored in `chartScaleType` variable
   - Always destroy previous chart before creating new one
   - Use Chart.js callbacks for terminal-style tooltips
   - Maintain consistency with terminal color scheme

4. **Data Handling**:
   - CSV parser handles quoted fields and comma-separated numbers
   - Always validate date format (MM/DD/YYYY)
   - Handle missing data gracefully (show dashes or "---")
   - Current year added dynamically from live API

5. **Responsive Design**:
   - Font sizes scale proportionally (11px → 8px)
   - Test ANSI blocks at all breakpoints
   - Horizontal scroll for blocks on mobile
   - Chart maintains aspect ratio

6. **Performance**:
   - Single-file architecture (no build step)
   - CDN-loaded dependencies (Tailwind, Chart.js)
   - Data loads in background on init
   - Skip rendering on initial load (performance)

## GitHub Actions

The repository includes Claude Code integration workflows in `.github/workflows/`:
- `claude.yml` - Claude Code workflow for AI-assisted development
- `claude-code-review.yml` - Automated code review workflow

## Testing Checklist

When making changes, verify:

- [ ] ANSI blocks render correctly (all 10 lines aligned)
- [ ] Character spacing consistent across browsers
- [ ] Current year highlighted correctly
- [ ] Chart scale toggle works (LOG/LINEAR)
- [ ] Calculator returns accurate results
- [ ] Table shows correct metrics
- [ ] Live price updates from API
- [ ] Responsive design works on mobile
- [ ] Terminal theme consistent throughout
- [ ] No console errors
- [ ] CSV fallback data works if files unavailable

## Browser Compatibility

Tested and verified on:
- Chrome/Edge (Chromium)
- Firefox
- Safari (macOS/iOS)

**Font rendering notes:**
- Menlo/Monaco: Best on macOS
- Consolas: Best on Windows
- Fallback to monospace on other systems
- Unicode box-drawing characters supported in all modern browsers
