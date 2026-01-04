# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A zero-build, single-page web application that displays Bitcoin's historical price on today's date across all years since the genesis block (January 3, 2009). The app features a calculator-first landing page that reveals historical data (blockchain visualization blocks, price chart, and data table) after user interaction.

**Live URL**: https://mjamiv.github.io/btcyoy/

**User Flow:**
1. Page loads with investment calculator as landing page
2. User selects date and investment amount, clicks "Calculate Returns"
3. Results display: "On [date] I invested [$X] to purchase [Y] BTC"
4. Historical data sections reveal with blockchain blocks aligned above chart
5. Blocks maintain alignment with chart plot points on window resize

## Running the Application

No build step required. Simply open `index.html` in a browser:
- Local: `open index.html` (macOS) or double-click the file
- The app loads all dependencies via CDN (Tailwind CSS, Chart.js)
- Data is fetched from the `btc-historical-price` CSV file in the repo root

## Architecture

### Single-File Application
All HTML, CSS, and JavaScript are contained in `index.html`. The application:
1. Shows investment calculator as landing page (historical data hidden initially)
2. Loads historical BTC price data from `btc-historical-price` in background (CSV format: `Date,Price`)
3. Fetches live BTC price from CoinGecko API (`https://api.coingecko.com/api/v3/simple/price`)
4. Filters data for today's month/day across all available years
5. On calculator submission, reveals three views:
   - **Blockchain blocks**: Compact cards positioned above chart, aligned with x-axis plot points
   - **Chart.js line chart**: Logarithmic scale showing price progression
   - **Data table**: Metrics including Return Since Genesis, 5-Year CAGR, Return Since Purchase

### Page Structure
```
┌─────────────────────────────────┐
│  Investment Calculator          │ ← Always visible (landing page)
│  (Results: "On [date]...")      │
└─────────────────────────────────┘
          ↓ (revealed after submission)
┌─────────────────────────────────┐
│  Blockchain Blocks (Grid)       │
│  ┌───┐ ┌───┐ ┌───┐ ┌───┐       │ ← Aligned with chart
│  │yr │ │yr │ │yr │ │yr │       │
│  └─┬─┘ └─┬─┘ └─┬─┘ └─┬─┘       │
├────▼────▼────▼────▼─────────────┤
│  Chart.js (Plot Points)         │
└─────────────────────────────────┘
┌─────────────────────────────────┐
│  Data Table                     │
└─────────────────────────────────┘
```

### Block-Chart Alignment System
- **Absolute Positioning**: Blockchain blocks use `position: absolute` for pixel-perfect alignment
- **Chart.js API Integration**: Uses `chart.scales.x.getPixelForValue(index)` to get exact pixel positions
- **Centering**: Each block centered at its data point using `translateX(-50%)`
- **Connecting Lines**: Gold-colored lines connect consecutive blocks, positioned from right edge to left edge
- **Responsive Handling**:
  - Window resize listener (150ms debounce) recalculates alignment
  - Chart.js `onResize` callback triggers realignment
  - Blocks and connectors automatically adjust to maintain chart synchronization

### Initialization Flow
1. `init()` → Hide historical sections (`hideHistoricalSections()`)
2. `loadData(true)` → Load and process data without rendering (skipRender flag)
3. `fetchCurrentPrice()` → Get live BTC price, add current year (2026) to dataset via `addCurrentYearToData()`
4. `setupChartResizeHandler()` → Attach resize event listeners
5. User interacts with calculator → `calculateReturns()` triggered
6. `showHistoricalSections()` → Reveal chart, blocks, table
7. `renderChart()` / `renderTimelineCards()` / `renderTable()` → Render views with current year included
8. `alignBlocksWithChart()` → Position blocks and create connecting lines (called after 100ms delay)

### Data Flow
- `parseCSV()` → Parse CSV into `{dateStr: price}` object
- `filterTodayData()` → Extract entries matching current month/day from all years
- `fetchCurrentPrice()` → Get live BTC price from CoinGecko API
- `addCurrentYearToData()` → Add current year (2026) with live price to dataset
- `calculateMetrics()` → Compute returns, CAGR for each year (including current year)
- `renderChart()` → Create Chart.js instance with logarithmic y-axis
- `renderTimelineCards()` → Generate blockchain blocks in chronological order with current year highlighted
- `alignBlocksWithChart()` → Position blocks using absolute positioning and create connector lines
- `renderTable()` → Display data table with optional purchase comparison, current year at top

### Key Functions
- **Date matching**: Uses `MM/DD/YYYY` format; filters by matching `todayMonth` and `todayDay`
- **CAGR calculation**: 5-year Compound Annual Growth Rate computed for years with 5+ years of history
- **Investment calculator**:
  - Converts USD amount to BTC at purchase date price
  - Calculates current value using latest price (live or most recent historical)
  - Displays: "On [date] I invested [$X] to purchase [Y] BTC"
  - Shows current value and total return percentage
- **Block alignment**:
  - Queries Chart.js internal API for x-axis pixel positions
  - Uses absolute positioning with `left` and `translateX(-50%)` for centering
  - Dynamically creates connector lines between consecutive blocks
  - Connector lines positioned from right edge of one block to left edge of next
- **Section visibility**: `hideHistoricalSections()` / `showHistoricalSections()` control wrapper visibility
- **Fallback data**: If `btc-historical-price` file unavailable, uses embedded `sampleHistoricalData`
- **Number formatting**:
  - `formatCurrency()` → Standard format with 2 decimals for calculator results
  - `formatCurrencyTable()` → Whole numbers for table display ($91,267)
  - `formatPercent()` → Standard format with 2 decimals for calculator
  - `formatPercentTable()` → Whole numbers for table display (+304%)
- **Current year integration**:
  - Live price fetched from CoinGecko API
  - Current year (2026) automatically added to all visualizations
  - Special highlighting: 🔴 indicator in blocks, orange background in table
  - Pulse animation effect on current year blockchain card

### Blockchain Block Design
Each block displays minimal, legible information:
- **Year**: Medium, gold-colored text (text-sm), current year shows 🔴 indicator
- **Price**: Small, white text (text-xs), formatted as whole numbers ($91,267)
- **Change**: Tiny arrow (↑/↓) with percentage (0.6rem), whole numbers (↑15%)

**Styling:**
- Width: 90px (desktop), 75px (tablet), 60px (mobile)
- Padding: p-2 for compact layout
- Glass-morphism effect with hover animations
- Background tint: green for price increases, red for decreases
- Current year: pulse animation with special `current-year` class
- Absolute positioning centered at exact chart data points

**Connecting Lines:**
- 3px solid gold lines between consecutive blocks
- Lines connect from right edge of one block to left edge of next
- Positioned at 50% height of blocks
- z-index: 0 (behind blocks)

**Responsive Behavior:**
- Blocks shrink proportionally on smaller screens
- Font sizes adjust for mobile (0.75rem)
- Position and connectors recalculate on window resize

## Data File

`btc-historical-price`: CSV file with no file extension
- Format: `Date,Price` header, then `MM/DD/YYYY,price` rows
- Contains daily Bitcoin prices
- App loads this via `fetch('btc-historical-price')` (tries `.csv` extension first, then without)

## GitHub Actions

The repository includes Claude Code integration workflows in `.github/workflows/`:
- `claude.yml` - Claude Code workflow
- `claude-code-review.yml` - Code review workflow
