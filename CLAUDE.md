# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A zero-build, single-page web application that displays Bitcoin's historical price on today's date across all years since the genesis block (January 3, 2009). The app provides an investment calculator, price chart, and historical data table.

**Live URL**: https://mjamiv.github.io/btcyoy/

## Running the Application

No build step required. Simply open `index.html` in a browser:
- Local: `open index.html` (macOS) or double-click the file
- The app loads all dependencies via CDN (Tailwind CSS, Chart.js)
- Data is fetched from the `btc-historical-price` CSV file in the repo root

## Architecture

### Single-File Application
All HTML, CSS, and JavaScript are contained in `index.html`. The application:
1. Loads historical BTC price data from `btc-historical-price` (CSV format: `Date,Price`)
2. Fetches live BTC price from CoinGecko API (`https://api.coingecko.com/api/v3/simple/price`)
3. Filters data for today's month/day across all available years
4. Renders three views:
   - Investment calculator with returns breakdown
   - Chart.js line chart (logarithmic scale) showing price progression
   - Data table with metrics: Return Since Genesis, 5-Year CAGR, Return Since Purchase

### Data Flow
- `parseCSV()` → Parse CSV into `{dateStr: price}` object
- `filterTodayData()` → Extract entries matching current month/day from all years
- `calculateMetrics()` → Compute returns, CAGR for each year
- `renderTable()` / `renderChart()` → Display processed data

### Key Functions
- **Date matching**: Uses `MM/DD/YYYY` format; filters by matching `todayMonth` and `todayDay`
- **CAGR calculation**: 5-year Compound Annual Growth Rate computed for years with 5+ years of history
- **Investment calculator**: Converts USD amount to BTC at purchase year price, calculates current value using latest price (live or most recent historical)
- **Fallback data**: If `btc-historical-price` file unavailable, uses embedded `sampleHistoricalData`

## Data File

`btc-historical-price`: CSV file with no file extension
- Format: `Date,Price` header, then `MM/DD/YYYY,price` rows
- Contains daily Bitcoin prices
- App loads this via `fetch('btc-historical-price')` (tries `.csv` extension first, then without)

## GitHub Actions

The repository includes Claude Code integration workflows in `.github/workflows/`:
- `claude.yml` - Claude Code workflow
- `claude-code-review.yml` - Code review workflow
