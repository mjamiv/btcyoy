# btcyoy
An interactive, single-page view of Bitcoin's price on today's date for every year since the genesis block. Data is sourced from
the provided `btc-historical-price` CSV file in the repository root.

## Running the app
Open `index.html` in your browser (no build step required). Everything is bundled via CDN, and the page reads data from the local
`btc-historical-price` file.

## Features
- Table with the date, BTC/USD price, percent return versus the genesis block price, 5-year CAGR, and returns versus a custom purchase year.
- Line chart showing BTC/USD across years for today's month and day.
- Purchase year selector to instantly compare yearly snapshots against the year you first bought in.
