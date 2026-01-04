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
- **CSS Grid Layout**: Blockchain blocks use `display: grid` with dynamically calculated columns
- **Chart.js API Integration**: Uses `chart.scales.x.getPixelForValue(index)` to get exact pixel positions
- **Grid Column Generation**: Calculates column widths based on spacing between chart plot points
- **Responsive Handling**:
  - Window resize listener (150ms debounce) recalculates alignment
  - Chart.js `onResize` callback triggers realignment
  - Blocks automatically adjust to maintain chart synchronization

### Initialization Flow
1. `init()` → Hide historical sections (`hideHistoricalSections()`)
2. `loadData(true)` → Load and process data without rendering (skipRender flag)
3. `fetchCurrentPrice()` → Get live BTC price in background
4. `setupChartResizeHandler()` → Attach resize event listeners
5. User interacts with calculator → `calculateReturns()` triggered
6. `showHistoricalSections()` → Reveal chart, blocks, table
7. `renderChart()` / `renderTimelineCards()` / `renderTable()` → Render views
8. `alignBlocksWithChart()` → Position blocks above chart (called after 100ms delay)

### Data Flow
- `parseCSV()` → Parse CSV into `{dateStr: price}` object
- `filterTodayData()` → Extract entries matching current month/day from all years
- `calculateMetrics()` → Compute returns, CAGR for each year
- `renderChart()` → Create Chart.js instance with logarithmic y-axis
- `renderTimelineCards()` → Generate blockchain blocks in chronological order
- `alignBlocksWithChart()` → Calculate and apply CSS Grid columns for alignment
- `renderTable()` → Display data table with optional purchase comparison

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
  - Generates CSS Grid template matching chart spacing
  - Assigns each block to corresponding grid column
- **Section visibility**: `hideHistoricalSections()` / `showHistoricalSections()` control wrapper visibility
- **Fallback data**: If `btc-historical-price` file unavailable, uses embedded `sampleHistoricalData`

### Blockchain Block Design
Each block displays minimal, legible information:
- **Year**: Large, gold-colored text (text-lg)
- **Price**: White, semibold text (text-base)
- **Change**: Simple arrow (↑/↓) with percentage (text-xs)

**Styling:**
- Max width: 120px (desktop), 100px (tablet), 80px (mobile)
- Padding: p-3 for compact layout
- Glass-morphism effect with hover animations
- Background tint: green for price increases, red for decreases

**Responsive Behavior:**
- Blocks shrink proportionally on smaller screens
- Font sizes adjust for mobile (0.85rem)
- Grid columns recalculate on window resize

## Data File

`btc-historical-price`: CSV file with no file extension
- Format: `Date,Price` header, then `MM/DD/YYYY,price` rows
- Contains daily Bitcoin prices
- App loads this via `fetch('btc-historical-price')` (tries `.csv` extension first, then without)

## GitHub Actions

The repository includes Claude Code integration workflows in `.github/workflows/`:
- `claude.yml` - Claude Code workflow
- `claude-code-review.yml` - Code review workflow
