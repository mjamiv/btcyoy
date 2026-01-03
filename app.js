const PRICE_FILE = 'btc-historical-price';
const GENESIS_DATE = new Date('2009-01-03');

const priceTableBody = document.querySelector('#priceTable tbody');
const asOfEl = document.getElementById('asOf');
const purchaseYearSelect = document.getElementById('purchaseYear');
const legendEl = document.getElementById('legend');

let chartInstance;
let tableData = [];
let genesisPrice;

function formatCurrency(value) {
  if (value === undefined || value === null || Number.isNaN(value)) return 'N/A';
  return value.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });
}

function formatPercent(value) {
  if (value === undefined || value === null || Number.isNaN(value)) return 'N/A';
  return `${value.toFixed(2)}%`;
}

function dateKey(date) {
  return `${date.getMonth() + 1}-${date.getDate()}`;
}

function parseCsv(text) {
  return text
    .trim()
    .split(/\r?\n/)
    .slice(1)
    .map((row) => {
      const [dateStr, priceStr] = row.split(',');
      const parsedDate = new Date(dateStr);
      const price = Number(priceStr);
      if (!Number.isFinite(price) || Number.isNaN(parsedDate.valueOf())) {
        return null;
      }
      return { date: parsedDate, price };
    })
    .filter(Boolean);
}

function findGenesisPrice(records) {
  const entry = records.find((r) => r.date.toDateString() === GENESIS_DATE.toDateString());
  return entry ? entry.price : null;
}

function buildPurchaseYearOptions(years) {
  purchaseYearSelect.innerHTML = '';
  years.forEach((year) => {
    const opt = document.createElement('option');
    opt.value = year;
    opt.textContent = year;
    purchaseYearSelect.appendChild(opt);
  });
}

function computeRows(records) {
  const today = new Date();
  const monthDayKey = dateKey(today);
  const byYear = new Map();

  records.forEach((entry) => {
    if (dateKey(entry.date) === monthDayKey) {
      byYear.set(entry.date.getFullYear(), entry);
    }
  });

  const earliestYear = 2009;
  const latestYear = Math.min(today.getFullYear(), Math.max(...records.map((r) => r.date.getFullYear())));

  const rows = [];
  for (let year = earliestYear; year <= latestYear; year += 1) {
    const entry = byYear.get(year);
    rows.push({
      year,
      date: entry ? entry.date : null,
      price: entry ? entry.price : null,
    });
  }

  return rows;
}

function computeReturns(rows, comparisonYearPrice) {
  return rows.map((row) => {
    const base = genesisPrice;
    const returnGenesis = base && row.price ? ((row.price - base) / base) * 100 : null;
    const comparison = comparisonYearPrice && row.price ? ((row.price - comparisonYearPrice) / comparisonYearPrice) * 100 : null;
    return { ...row, returnGenesis, comparison };
  });
}

function renderTable(rows) {
  priceTableBody.innerHTML = '';
  rows.forEach((row) => {
    const tr = document.createElement('tr');
    const dateUsed = row.date ? row.date.toLocaleDateString('en-US') : 'N/A';
    tr.innerHTML = `
      <td>${row.year}</td>
      <td>${dateUsed}</td>
      <td>${formatCurrency(row.price)}</td>
      <td>${formatPercent(row.returnGenesis)}</td>
      <td>${formatPercent(row.comparison)}</td>
    `;
    priceTableBody.appendChild(tr);
  });
}

function renderLegend(buyYear) {
  legendEl.innerHTML = '';
  const items = [
    { label: 'BTC/USD on this date', color: '#f7931a' },
  ];
  if (buyYear) {
    items.push({ label: `Return vs ${buyYear}`, color: '#2dd4bf' });
  }
  items.forEach((item) => {
    const span = document.createElement('span');
    span.innerHTML = `<span class="swatch" style="background:${item.color}"></span>${item.label}`;
    legendEl.appendChild(span);
  });
}

function renderChart(rows, buyYear) {
  const labels = rows.map((r) => r.year);
  const prices = rows.map((r) => (r.price ? r.price : null));
  const comparisonReturns = rows.map((r) => (r.comparison !== null ? r.comparison : null));

  const datasets = [
    {
      label: 'BTC/USD',
      data: prices,
      borderColor: '#f7931a',
      backgroundColor: 'rgba(247, 147, 26, 0.15)',
      tension: 0.25,
      spanGaps: true,
    },
  ];

  if (buyYear) {
    datasets.push({
      label: `% Return vs ${buyYear}`,
      data: comparisonReturns,
      borderColor: '#2dd4bf',
      backgroundColor: 'rgba(45, 212, 191, 0.18)',
      yAxisID: 'y1',
      tension: 0.25,
      spanGaps: true,
    });
  }

  if (chartInstance) chartInstance.destroy();

  const ctx = document.getElementById('priceChart').getContext('2d');
  chartInstance = new Chart(ctx, {
    type: 'line',
    data: { labels, datasets },
    options: {
      scales: {
        y: {
          beginAtZero: false,
          grid: { color: 'rgba(255,255,255,0.05)' },
          ticks: { color: '#e5e7eb' },
        },
        y1: {
          position: 'right',
          grid: { display: false },
          ticks: { color: '#2dd4bf', callback: (v) => `${v}%` },
        },
        x: {
          grid: { color: 'rgba(255,255,255,0.05)' },
          ticks: { color: '#e5e7eb' },
        },
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label(context) {
              const datasetLabel = context.dataset.label || '';
              if (datasetLabel.startsWith('% Return')) {
                return `${datasetLabel}: ${formatPercent(context.parsed.y)}`;
              }
              return `${datasetLabel}: ${formatCurrency(context.parsed.y)}`;
            },
          },
        },
      },
    },
  });

  renderLegend(buyYear);
}

function updateView(buyYear) {
  const purchaseYearPrice = tableData.find((row) => row.year === buyYear)?.price ?? null;
  const rowsWithReturns = computeReturns(tableData, purchaseYearPrice);
  renderTable(rowsWithReturns);
  renderChart(rowsWithReturns, purchaseYearPrice ? buyYear : null);
}

async function init() {
  try {
    const response = await fetch(PRICE_FILE);
    if (!response.ok) throw new Error('Unable to load price file');
    const csvText = await response.text();
    const records = parseCsv(csvText);

    genesisPrice = findGenesisPrice(records);
    if (!genesisPrice) {
      throw new Error('Genesis block price not found in file.');
    }

    tableData = computeRows(records);

    const years = tableData.map((row) => row.year);
    buildPurchaseYearOptions(years);
    purchaseYearSelect.value = Math.max(...years);

    const today = new Date();
    asOfEl.textContent = `Showing prices for ${today.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} across ${years.length} years`;

    purchaseYearSelect.addEventListener('change', (e) => {
      updateView(Number(e.target.value));
    });

    updateView(Number(purchaseYearSelect.value));
  } catch (error) {
    priceTableBody.innerHTML = `<tr><td colspan="5">${error.message}</td></tr>`;
    console.error(error);
  }
}

init();
