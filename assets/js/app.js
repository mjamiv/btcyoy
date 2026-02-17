(() => {
    "use strict";

    // Sample historical data (fallback if CSV not available)
    // Format: MM/DD/YYYY for matching purposes
    const sampleHistoricalData = `Date,Price
01/03/2011,0.30
01/03/2012,5.27
01/03/2013,13.30
01/03/2014,770.44
01/03/2015,314.25
01/03/2016,430.01
01/03/2017,1021.75
01/03/2018,14764.20
01/03/2019,3843.52
01/03/2020,7344.88
01/03/2021,32782.02
01/03/2022,46458.12
01/03/2023,16625.08
01/03/2024,44172.22
01/03/2025,97500.00
11/23/2011,2.48
11/23/2012,11.99
11/23/2013,798.62
11/23/2014,367.13
11/23/2015,323.87
11/23/2016,740.36
11/23/2017,8112.24
11/23/2018,4346.75
11/23/2019,7178.25
11/23/2020,18353.27
11/23/2021,56287.46
11/23/2022,16589.23
11/23/2023,37420.89
11/23/2024,99588.00
11/23/2025,98827.00`;

    const STORAGE_KEYS = {
        chartScale: "btcyoy.chartScale",
        myGenesisDate: "btcyoy.myGenesisDate"
    };

    const REFRESH_INTERVAL_MS = 120000;
    const API_TIMEOUT_MS = 10000;
    const CSV_TIMEOUT_MS = 5000;

    const today = new Date();
    const todayMonth = today.getMonth() + 1;
    const todayDay = today.getDate();
    const todayYear = today.getFullYear();

    const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    const monthAbbr = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

    const moneyFormatter = new Intl.NumberFormat("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
    const wholeFormatter = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

    const state = {
        historicalData: {},
        todayData: [],
        chart: null,
        chartScaleType: "logarithmic",
        currentPrice: null,
        myGenesisData: null,
        fetchingLivePrice: false,
        autoRefreshTimer: null,
        lastPriceTimestamp: null
    };

    const refs = {
        tableDateHeader: document.getElementById("tableDateHeader"),
        timelineDate: document.getElementById("timelineDate"),
        priceTableBody: document.getElementById("priceTableBody"),
        blocksOverlay: document.getElementById("blocksOverlay"),
        priceChart: document.getElementById("priceChart"),
        livePrice: document.getElementById("livePrice"),
        priceSource: document.getElementById("priceSource"),
        appStatus: document.getElementById("appStatus"),
        lastUpdated: document.getElementById("lastUpdated"),
        myGenesisDate: document.getElementById("myGenesisDate"),
        myGenesisDateMobile: document.getElementById("myGenesisDateMobile"),
        clearGenesisBtn: document.getElementById("clearGenesisBtn"),
        clearGenesisBtnMobile: document.getElementById("clearGenesisBtnMobile"),
        myGenesisHeader: document.getElementById("myGenesisHeader"),
        logScaleBtn: document.getElementById("logScaleBtn"),
        linearScaleBtn: document.getElementById("linearScaleBtn"),
        refreshPriceBtn: document.getElementById("refreshPriceBtn"),
        container: document.querySelector(".container")
    };

    function safeStorageSet(key, value) {
        try {
            localStorage.setItem(key, value);
        } catch (_error) {
            // Ignore storage errors (private mode / quota).
        }
    }

    function safeStorageGet(key) {
        try {
            return localStorage.getItem(key);
        } catch (_error) {
            return null;
        }
    }

    function safeStorageRemove(key) {
        try {
            localStorage.removeItem(key);
        } catch (_error) {
            // Ignore storage errors (private mode / quota).
        }
    }

    function setStatus(message, type = "ok") {
        if (!refs.appStatus) return;
        refs.appStatus.textContent = message || "";
        refs.appStatus.classList.remove("status-ok", "status-error");
        if (message) {
            refs.appStatus.classList.add(type === "error" ? "status-error" : "status-ok");
        }
    }

    function updateLastUpdated(timestamp) {
        if (!refs.lastUpdated) return;
        if (!timestamp) {
            refs.lastUpdated.textContent = "Last updated: --";
            return;
        }

        const fmt = new Intl.DateTimeFormat("en-US", {
            year: "numeric",
            month: "short",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit"
        });
        refs.lastUpdated.textContent = `Last updated: ${fmt.format(timestamp)}`;
    }

    function toggleRefreshButtonLoading(isLoading) {
        if (!refs.refreshPriceBtn) return;
        refs.refreshPriceBtn.disabled = isLoading;
        refs.refreshPriceBtn.textContent = isLoading ? "Refreshing" : "Refresh";
    }

    function parseCSV(csvText) {
        const normalized = csvText.replace(/^\uFEFF/, "");
        const lines = normalized.trim().split("\n");
        const data = {};

        for (let i = 1; i < lines.length; i += 1) {
            const line = lines[i].trim();
            if (!line) continue;

            const parts = [];
            let current = "";
            let inQuotes = false;

            for (let j = 0; j < line.length; j += 1) {
                const ch = line[j];
                if (ch === "\"") {
                    inQuotes = !inQuotes;
                } else if (ch === "," && !inQuotes) {
                    parts.push(current.trim());
                    current = "";
                } else {
                    current += ch;
                }
            }
            parts.push(current.trim());

            if (parts.length < 2) continue;

            const dateStr = parts[0].replace(/"/g, "").trim();
            const rawPrice = parts[1].replace(/"/g, "").trim();

            if (!/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateStr)) continue;

            const numericPrice = parseFloat(rawPrice.replace(/,/g, ""));
            if (!Number.isFinite(numericPrice) || numericPrice < 0) continue;

            data[dateStr] = numericPrice;
        }

        return data;
    }

    function filterTodayData(data) {
        const result = [];

        for (const [dateStr, price] of Object.entries(data)) {
            const parts = dateStr.split("/");
            if (parts.length !== 3) continue;

            const month = parseInt(parts[0], 10);
            const day = parseInt(parts[1], 10);
            const year = parseInt(parts[2], 10);

            if (month === todayMonth && day === todayDay) {
                result.push({ date: dateStr, year, price });
            }
        }

        result.sort((a, b) => a.year - b.year);
        return result;
    }

    function calculateMetrics(data) {
        if (!data.length) return data;

        const genesisPrice = data[0].price;
        return data.map((item, index) => {
            const returnSinceGenesis = genesisPrice > 0
                ? ((item.price - genesisPrice) / genesisPrice) * 100
                : null;

            let cagr5Year = null;
            if (index >= 5) {
                const price5YearsAgo = data[index - 5].price;
                if (price5YearsAgo > 0) {
                    cagr5Year = (Math.pow(item.price / price5YearsAgo, 1 / 5) - 1) * 100;
                }
            }

            return {
                ...item,
                returnSinceGenesis,
                cagr5Year
            };
        });
    }

    function formatCurrency(value) {
        if (value === null || value === undefined) return "-";
        if (value >= 1) return `$${moneyFormatter.format(value)}`;
        return `$${value.toFixed(4)}`;
    }

    function formatCurrencyTable(value) {
        if (value === null || value === undefined) return "-";
        return `$${wholeFormatter.format(Math.round(value))}`;
    }

    function formatPercentTable(value, includeSign = true) {
        if (value === null || value === undefined) return "-";
        const sign = value >= 0 ? "+" : "";
        return `${includeSign ? sign : ""}${wholeFormatter.format(Math.round(value))}%`;
    }

    function toDaySortYear(year, month, day) {
        const dayOfYear = Math.floor((new Date(year, month - 1, day) - new Date(year, 0, 0)) / (1000 * 60 * 60 * 24));
        return year + (dayOfYear / 366);
    }

    function getMergedDataWithGenesis(baseData) {
        const merged = baseData.map((item) => ({ ...item, isMyGenesis: false }));
        if (!state.myGenesisData) return merged;

        const existingIndex = merged.findIndex((item) => item.year === state.myGenesisData.year);
        const sameDateAsToday = state.myGenesisData.month === todayMonth && state.myGenesisData.day === todayDay;

        if (existingIndex === -1) {
            merged.push({
                date: state.myGenesisData.date,
                year: state.myGenesisData.year,
                month: state.myGenesisData.month,
                day: state.myGenesisData.day,
                price: state.myGenesisData.price,
                sortYear: toDaySortYear(state.myGenesisData.year, state.myGenesisData.month, state.myGenesisData.day),
                isMyGenesis: true
            });
        } else if (sameDateAsToday) {
            merged[existingIndex].isMyGenesis = true;
        } else {
            merged.push({
                date: state.myGenesisData.date,
                year: state.myGenesisData.year,
                month: state.myGenesisData.month,
                day: state.myGenesisData.day,
                price: state.myGenesisData.price,
                sortYear: toDaySortYear(state.myGenesisData.year, state.myGenesisData.month, state.myGenesisData.day),
                isMyGenesis: true
            });
        }

        merged.sort((a, b) => (a.sortYear || a.year) - (b.sortYear || b.year));
        return merged;
    }

    function renderTable(data) {
        const colSpan = state.myGenesisData ? 5 : 4;
        if (!data.length) {
            refs.priceTableBody.innerHTML = `<tr><td colspan="${colSpan}" class="text-center py-8 text-dim">[ No data available ]</td></tr>`;
            return;
        }

        const tableData = getMergedDataWithGenesis(data);
        const genesisSortYear = state.myGenesisData
            ? toDaySortYear(state.myGenesisData.year, state.myGenesisData.month, state.myGenesisData.day)
            : null;

        refs.priceTableBody.innerHTML = tableData.map((item) => {
            const hasGenesisReturn = typeof item.returnSinceGenesis === "number" && Number.isFinite(item.returnSinceGenesis);
            const returnClass = hasGenesisReturn && item.returnSinceGenesis >= 0 ? "positive" : "negative";
            const hasCagr = typeof item.cagr5Year === "number" && Number.isFinite(item.cagr5Year);
            const cagrClass = hasCagr && item.cagr5Year >= 0 ? "positive" : "negative";
            const isCurrentYear = item.year === todayYear && !item.isMyGenesis;
            const rowClass = item.isMyGenesis ? "my-genesis-row" : (isCurrentYear ? "current-row" : "");
            const liveTag = isCurrentYear ? " <span class=\"live-indicator\">[LIVE]</span>" : "";

            const dateLabel = item.isMyGenesis
                ? `${monthNames[(item.month || state.myGenesisData.month) - 1]} ${item.day || state.myGenesisData.day}, ${item.year} <span class=\"my-genesis-inline-tag\">[MY GENESIS]</span>`
                : `${monthNames[todayMonth - 1]} ${todayDay}, ${item.year}${liveTag}`;

            let myGenesisReturnCell = "";
            if (state.myGenesisData) {
                const itemSortYear = item.sortYear || item.year;
                if (item.isMyGenesis) {
                    myGenesisReturnCell = "<td class=\"text-right my-genesis-cell\">---</td>";
                } else if (itemSortYear > genesisSortYear) {
                    const myGenesisReturn = calculateMyGenesisReturn(item.price);
                    const myGenesisClass = myGenesisReturn !== null && myGenesisReturn >= 0 ? "positive" : "negative";
                    myGenesisReturnCell = `<td class=\"text-right ${myGenesisClass}\">${myGenesisReturn !== null ? formatPercentTable(myGenesisReturn) : "---"}</td>`;
                } else {
                    myGenesisReturnCell = "<td class=\"text-right text-dim\">---</td>";
                }
            }

            return `
                <tr class="${rowClass}">
                    <td>${dateLabel}</td>
                    <td class="text-right text-amber">${formatCurrencyTable(item.price)}</td>
                    <td class="text-right ${returnClass}">${hasGenesisReturn ? formatPercentTable(item.returnSinceGenesis) : "---"}</td>
                    ${myGenesisReturnCell}
                    <td class="text-right ${cagrClass}">${hasCagr ? formatPercentTable(item.cagr5Year) : "---"}</td>
                </tr>
            `;
        }).reverse().join("");
    }

    function buildChartData(data) {
        return getMergedDataWithGenesis(data);
    }

    function tooltipCallbacks(chartData) {
        return {
            title(context) {
                const dataIndex = context[0].dataIndex;
                const isMyGenesis = chartData[dataIndex] && chartData[dataIndex].isMyGenesis;
                return isMyGenesis ? `[ MY GENESIS ${context[0].label} ]` : `[ ${context[0].label} ]`;
            },
            label(context) {
                return `> ${formatCurrency(context.raw)}`;
            }
        };
    }

    function renderChart(data) {
        if (!refs.priceChart || typeof Chart === "undefined") {
            setStatus("Chart library unavailable.", "error");
            return;
        }

        const chartData = buildChartData(data);
        const labels = chartData.map((d) => d.year.toString());
        const prices = chartData.map((d) => d.price);

        const pointBackgroundColors = chartData.map((d) => (d.isMyGenesis ? "#ff00ff" : "#f7931a"));
        const pointBorderColors = chartData.map((d) => (d.isMyGenesis ? "#ff00ff" : "#0a0a0a"));
        const pointRadii = chartData.map((d) => (d.isMyGenesis ? 8 : 4));

        if (!state.chart) {
            const ctx = refs.priceChart.getContext("2d");
            state.chart = new Chart(ctx, {
                type: "line",
                data: {
                    labels,
                    datasets: [{
                        label: "BTC Price (USD)",
                        data: prices,
                        borderColor: "#f7931a",
                        backgroundColor: "rgba(247, 147, 26, 0.05)",
                        borderWidth: 2,
                        fill: true,
                        tension: 0,
                        pointBackgroundColor: pointBackgroundColors,
                        pointBorderColor: pointBorderColors,
                        pointBorderWidth: 2,
                        pointRadius: pointRadii,
                        pointHoverRadius: 6,
                        pointStyle: "rect"
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            backgroundColor: "#161b22",
                            titleColor: "#00ffff",
                            bodyColor: "#00ff00",
                            borderColor: "#30363d",
                            borderWidth: 1,
                            padding: 12,
                            displayColors: false,
                            titleFont: {
                                family: "'IBM Plex Mono', monospace",
                                size: 12
                            },
                            bodyFont: {
                                family: "'IBM Plex Mono', monospace",
                                size: 14
                            },
                            callbacks: tooltipCallbacks(chartData)
                        }
                    },
                    scales: {
                        x: {
                            grid: {
                                color: "rgba(48, 54, 61, 0.5)",
                                lineWidth: 1,
                                drawBorder: true,
                                borderColor: "#30363d",
                                borderDash: [2, 2]
                            },
                            ticks: {
                                color: "#6e7681",
                                font: {
                                    family: "'IBM Plex Mono', monospace",
                                    size: 11
                                }
                            }
                        },
                        y: {
                            type: state.chartScaleType,
                            grid: {
                                color: "rgba(48, 54, 61, 0.5)",
                                lineWidth: 1,
                                drawBorder: true,
                                borderColor: "#30363d",
                                borderDash: [2, 2]
                            },
                            ticks: {
                                color: "#6e7681",
                                font: {
                                    family: "'IBM Plex Mono', monospace",
                                    size: 11
                                },
                                callback(value) {
                                    if (value >= 1000) {
                                        return `$${(value / 1000).toFixed(0)}k`;
                                    }
                                    return `$${value}`;
                                }
                            }
                        }
                    },
                    elements: {
                        line: {
                            borderCapStyle: "square",
                            borderJoinStyle: "miter"
                        }
                    }
                }
            });
            return;
        }

        state.chart.data.labels = labels;
        const dataset = state.chart.data.datasets[0];
        dataset.data = prices;
        dataset.pointBackgroundColor = pointBackgroundColors;
        dataset.pointBorderColor = pointBorderColors;
        dataset.pointRadius = pointRadii;

        state.chart.options.scales.y.type = state.chartScaleType;
        state.chart.options.plugins.tooltip.callbacks = tooltipCallbacks(chartData);
        state.chart.update("none");
    }

    function setChartScale(scaleType, persist = true) {
        if (scaleType !== "logarithmic" && scaleType !== "linear") return;

        state.chartScaleType = scaleType;
        refs.logScaleBtn.classList.toggle("active", scaleType === "logarithmic");
        refs.linearScaleBtn.classList.toggle("active", scaleType === "linear");
        refs.logScaleBtn.setAttribute("aria-pressed", scaleType === "logarithmic");
        refs.linearScaleBtn.setAttribute("aria-pressed", scaleType === "linear");

        if (persist) {
            safeStorageSet(STORAGE_KEYS.chartScale, scaleType);
        }

        if (state.todayData.length) {
            renderChart(state.todayData);
        }
    }

    function renderTimelineCards(data) {
        if (!refs.blocksOverlay) return;

        if (!data.length) {
            refs.blocksOverlay.innerHTML = "<div class=\"aligned-block p-4 text-center\"><p class=\"text-dim text-sm\">[ NO DATA ]</p></div>";
            return;
        }

        const INNER_WIDTH = 15;

        function centerIn(str, width) {
            if (str.length >= width) return str.substring(0, width);
            const totalPad = width - str.length;
            const leftPad = Math.floor(totalPad / 2);
            const rightPad = totalPad - leftPad;
            return `${" ".repeat(leftPad)}${str}${" ".repeat(rightPad)}`;
        }

        const displayData = getMergedDataWithGenesis(data);
        const reversedData = [...displayData].reverse();

        const blocks = reversedData.map((item, index) => {
            const prevYearItem = index < reversedData.length - 1 ? reversedData[index + 1] : null;
            let changePercent = null;
            let changeClass = "";

            if (prevYearItem && prevYearItem.price > 0) {
                changePercent = ((item.price - prevYearItem.price) / prevYearItem.price) * 100;
                changeClass = changePercent >= 0 ? "ansi-block-change-positive" : "ansi-block-change-negative";
            }

            const isCurrentYear = item.year === todayYear;
            const isMyGenesis = item.isMyGenesis === true;
            const blockClass = isMyGenesis ? "my-genesis" : (isCurrentYear ? "current-year" : "");

            const dateStr = isMyGenesis
                ? `${monthAbbr[(item.month || state.myGenesisData.month) - 1]}. ${(item.day || state.myGenesisData.day).toString().padStart(2, "0")} '${item.year.toString().slice(-2)}`
                : `${monthAbbr[todayMonth - 1]}. ${todayDay.toString().padStart(2, "0")} '${item.year.toString().slice(-2)}`;

            const priceStr = `$ ${wholeFormatter.format(Math.round(item.price))}`;
            const changeStr = changePercent === null
                ? "---"
                : `${changePercent >= 0 ? "+" : "-"}${Math.abs(changePercent).toFixed(2)}`;

            const emptyLine = " ".repeat(INNER_WIDTH);
            const dateLine = centerIn(dateStr, INNER_WIDTH);
            const priceLine = centerIn(priceStr, INNER_WIDTH);
            const changeLine = centerIn(changeStr, INNER_WIDTH);
            const genesisLabel = isMyGenesis ? centerIn("MY GENESIS", INNER_WIDTH) : emptyLine;

            const isLastBlock = index === reversedData.length - 1;

            const TRAIL = "       ";
            const CONN_TOP = " ████╗ ";
            const CONN_BOT = " ╚═══╝ ";

            const L1 = `███████████████████╗${TRAIL}`;
            const L4 = `██${emptyLine}██║${TRAIL}`;
            const L6 = `██${emptyLine}██║${isLastBlock ? TRAIL : CONN_BOT}`;
            const L8 = `██${emptyLine}██║${TRAIL}`;
            const L9 = `███████████████████║${TRAIL}`;
            const L10 = `╚══════════════════╝${TRAIL}`;
            const dateClass = isMyGenesis ? "ansi-block-label" : "ansi-block-date";
            const L2 = isMyGenesis
                ? `██<span class="ansi-block-label">${genesisLabel}</span>██║${TRAIL}`
                : `██${emptyLine}██║${TRAIL}`;

            return `<div class="aligned-block ${blockClass}">${L1}
${L2}
██<span class="${dateClass}">${dateLine}</span>██║${TRAIL}
${L4}
██<span class="ansi-block-price">${priceLine}</span>██║${isLastBlock ? TRAIL : CONN_TOP}
${L6}
██<span class="${changeClass}">${changeLine}</span>██║${TRAIL}
${L8}
${L9}
${L10}</div>`;
        }).join("");

        refs.blocksOverlay.innerHTML = blocks;
    }

    function updateGenesisControlsVisibility() {
        const visible = !!state.myGenesisData;
        refs.clearGenesisBtn.classList.toggle("hidden", !visible);
        refs.clearGenesisBtnMobile.classList.toggle("hidden", !visible);
        refs.myGenesisHeader.classList.toggle("hidden", !visible);
    }

    function renderAllViews() {
        if (!state.todayData.length) return;
        renderTimelineCards(state.todayData);
        renderTable(state.todayData);
        renderChart(state.todayData);
    }

    function calculateMyGenesisReturn(price) {
        if (!state.myGenesisData || !state.myGenesisData.price || state.myGenesisData.price <= 0) return null;
        return ((price - state.myGenesisData.price) / state.myGenesisData.price) * 100;
    }

    function showGenesisError(msg) {
        const labels = document.querySelectorAll(".my-genesis-input label");
        labels.forEach((label) => {
            const existing = label.parentElement.querySelector(".genesis-error");
            if (existing) existing.remove();
            const err = document.createElement("div");
            err.className = "genesis-error";
            err.textContent = `[ERROR] ${msg}`;
            label.parentElement.appendChild(err);
            setTimeout(() => err.remove(), 5000);
        });
    }

    function clearMyGenesis(persist = true) {
        state.myGenesisData = null;
        refs.myGenesisDate.value = "";
        refs.myGenesisDateMobile.value = "";
        if (persist) {
            safeStorageRemove(STORAGE_KEYS.myGenesisDate);
        }
        updateGenesisControlsVisibility();
        renderAllViews();
    }

    function processMyGenesis(dateValue, persist = true) {
        if (!dateValue) {
            clearMyGenesis(persist);
            return;
        }

        const parts = dateValue.split("-");
        if (parts.length !== 3) {
            showGenesisError("Invalid date format.");
            return;
        }

        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10);
        const day = parseInt(parts[2], 10);
        const dateStr = `${month.toString().padStart(2, "0")}/${day.toString().padStart(2, "0")}/${year}`;

        let price = state.historicalData[dateStr];

        if (!price) {
            const inputDate = new Date(year, month - 1, day);
            let closestDiff = Infinity;
            const MAX_DAYS_DIFF = 7 * 24 * 60 * 60 * 1000;

            for (const [dateKey, candidatePrice] of Object.entries(state.historicalData)) {
                const dateParts = dateKey.split("/");
                const dataDate = new Date(
                    parseInt(dateParts[2], 10),
                    parseInt(dateParts[0], 10) - 1,
                    parseInt(dateParts[1], 10)
                );
                const diff = Math.abs(dataDate - inputDate);
                if (diff < closestDiff) {
                    closestDiff = diff;
                    price = candidatePrice;
                }
            }

            if (closestDiff > MAX_DAYS_DIFF) {
                price = null;
            }
        }

        if (!price) {
            showGenesisError("No price data available for this date or nearby dates.");
            clearMyGenesis(persist);
            return;
        }

        state.myGenesisData = {
            date: dateStr,
            year,
            month,
            day,
            price,
            inputValue: dateValue
        };

        refs.myGenesisDate.value = dateValue;
        refs.myGenesisDateMobile.value = dateValue;

        if (persist) {
            safeStorageSet(STORAGE_KEYS.myGenesisDate, dateValue);
        }

        updateGenesisControlsVisibility();
        renderAllViews();
    }

    function syncGenesisFromDesktop() {
        refs.myGenesisDateMobile.value = refs.myGenesisDate.value;
        processMyGenesis(refs.myGenesisDate.value);
    }

    function syncGenesisFromMobile() {
        refs.myGenesisDate.value = refs.myGenesisDateMobile.value;
        processMyGenesis(refs.myGenesisDateMobile.value);
    }

    function withTimeout(url, timeoutMs) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        return fetch(url, {
            signal: controller.signal,
            cache: "no-store"
        }).finally(() => clearTimeout(timer));
    }

    function addCurrentYearToData() {
        if (!Array.isArray(state.todayData) || !state.currentPrice) return;

        const currentYearIndex = state.todayData.findIndex((item) => item.year === todayYear);
        if (currentYearIndex >= 0) {
            state.todayData[currentYearIndex].price = state.currentPrice;
        } else {
            state.todayData.push({
                date: `${todayMonth.toString().padStart(2, "0")}/${todayDay.toString().padStart(2, "0")}/${todayYear}`,
                year: todayYear,
                price: state.currentPrice
            });
        }

        state.todayData.sort((a, b) => a.year - b.year);
        state.todayData = calculateMetrics(state.todayData);
        renderAllViews();
    }

    async function fetchCurrentPrice({ userInitiated = false } = {}) {
        if (state.fetchingLivePrice) return state.currentPrice;

        state.fetchingLivePrice = true;
        toggleRefreshButtonLoading(true);

        try {
            const response = await withTimeout(
                "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd",
                API_TIMEOUT_MS
            );

            if (!response.ok) {
                throw new Error(`API returned ${response.status}`);
            }

            const data = await response.json();
            if (!data || !data.bitcoin || typeof data.bitcoin.usd !== "number" || !Number.isFinite(data.bitcoin.usd)) {
                throw new Error("Invalid API response shape");
            }

            state.currentPrice = data.bitcoin.usd;
            state.lastPriceTimestamp = new Date();

            refs.livePrice.textContent = formatCurrency(state.currentPrice);
            refs.priceSource.textContent = "Live price from CoinGecko";
            updateLastUpdated(state.lastPriceTimestamp);
            setStatus(userInitiated ? "Live price refreshed." : "Live price online.", "ok");

            addCurrentYearToData();
            return state.currentPrice;
        } catch (error) {
            refs.livePrice.textContent = "Unable to fetch";
            refs.priceSource.textContent = "API unavailable";
            setStatus("Live price API unavailable. Showing historical data.", "error");
            return null;
        } finally {
            state.fetchingLivePrice = false;
            toggleRefreshButtonLoading(false);
        }
    }

    async function loadData() {
        let csvText = null;
        const filenames = [
            "Bitcoin%20Historical%20Data_missing%20data.csv",
            "Bitcoin Historical Data_missing data.csv",
            "btc-historical-price.csv",
            "btc-historical-price"
        ];

        for (const filename of filenames) {
            try {
                const response = await withTimeout(filename, CSV_TIMEOUT_MS);
                if (!response.ok) continue;

                const text = await response.text();
                if (text.trim().startsWith("Date,Price") || text.trim().startsWith("\"Date\"")) {
                    csvText = text;
                    break;
                }
            } catch (_error) {
                // try the next filename
            }
        }

        let usingSampleData = false;
        if (!csvText) {
            csvText = sampleHistoricalData;
            usingSampleData = true;
        }

        state.historicalData = parseCSV(csvText);
        state.todayData = calculateMetrics(filterTodayData(state.historicalData));

        if (state.todayData.length === 0) {
            const allData = Object.entries(state.historicalData)
                .map(([date, price]) => {
                    const parts = date.split("/");
                    return { date, year: parseInt(parts[2], 10), price };
                })
                .sort((a, b) => a.year - b.year);

            const uniqueYears = [...new Set(allData.map((d) => d.year))];
            state.todayData = uniqueYears
                .map((year) => allData.find((d) => d.year === year) || null)
                .filter(Boolean);

            state.todayData = calculateMetrics(state.todayData);
        }

        renderAllViews();

        if (usingSampleData && refs.container) {
            const existing = refs.container.querySelector(".notice-banner");
            if (!existing) {
                const banner = document.createElement("div");
                banner.className = "notice-banner";
                banner.textContent = "[NOTICE] Using sample data - historical CSV could not be loaded.";
                refs.container.prepend(banner);
            }
            setStatus("Using sample dataset. Add a CSV file for full history.", "error");
        }
    }

    function bindEvents() {
        refs.myGenesisDate.addEventListener("change", syncGenesisFromDesktop);
        refs.myGenesisDateMobile.addEventListener("change", syncGenesisFromMobile);
        refs.clearGenesisBtn.addEventListener("click", () => clearMyGenesis());
        refs.clearGenesisBtnMobile.addEventListener("click", () => clearMyGenesis());

        refs.logScaleBtn.addEventListener("click", () => setChartScale("logarithmic"));
        refs.linearScaleBtn.addEventListener("click", () => setChartScale("linear"));

        refs.refreshPriceBtn.addEventListener("click", () => {
            fetchCurrentPrice({ userInitiated: true });
        });

        document.addEventListener("visibilitychange", () => {
            if (!document.hidden) {
                fetchCurrentPrice();
            }
        });
    }

    function restorePreferences() {
        const savedScale = safeStorageGet(STORAGE_KEYS.chartScale);
        if (savedScale === "logarithmic" || savedScale === "linear") {
            setChartScale(savedScale, false);
        }
    }

    function startAutoRefresh() {
        state.autoRefreshTimer = setInterval(() => {
            if (!document.hidden) {
                fetchCurrentPrice();
            }
        }, REFRESH_INTERVAL_MS);
    }

    async function init() {
        refs.tableDateHeader.textContent = `${monthNames[todayMonth - 1]} ${todayDay}`;
        refs.timelineDate.textContent = `${monthNames[todayMonth - 1]} ${todayDay}`;

        const todayStr = `${todayYear}-${todayMonth.toString().padStart(2, "0")}-${todayDay.toString().padStart(2, "0")}`;
        refs.myGenesisDate.max = todayStr;
        refs.myGenesisDateMobile.max = todayStr;

        bindEvents();
        restorePreferences();
        updateGenesisControlsVisibility();
        updateLastUpdated(null);

        await loadData();
        await fetchCurrentPrice();

        const savedGenesisDate = safeStorageGet(STORAGE_KEYS.myGenesisDate);
        if (savedGenesisDate) {
            processMyGenesis(savedGenesisDate);
        }

        startAutoRefresh();
    }

    init().catch(() => {
        refs.priceTableBody.innerHTML =
            "<tr><td colspan=\"4\" class=\"text-center py-8 negative\">[ ERROR: Failed to initialize. Please reload. ]</td></tr>";
        setStatus("Initialization failed. Please reload.", "error");
    });
})();
