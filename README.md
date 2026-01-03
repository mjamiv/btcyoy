# btcyoy

An interactive, single-page view of Bitcoin's price on today's date for every year since the genesis block. Data is sourced from the provided `btc-historical-price` CSV file in the repository root.

## Getting started
1. Start a simple static server from the project root (for example):
   ```bash
   python -m http.server 8000
   ```
2. Visit http://localhost:8000 in your browser to load the dashboard.

## Features
- Table with the date, BTC/USD price, and percent return versus the genesis block price.
- Line chart showing BTC/USD across years for today's month and day.
- Purchase year selector to instantly compare yearly snapshots against the year you first bought in.
