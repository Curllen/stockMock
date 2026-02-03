// 全局变量
let simulationRunning = false;
let simulationInterval;
let stockData = [];
let chart;
let fetchButtonDebounce = false;

// Toast notification function
function showToast(message, type = 'info', title = '') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    const icons = {
        error: '❌',
        success: '✅',
        warning: '⚠️',
        info: 'ℹ️'
    };

    const titles = {
        error: title || '错误',
        success: title || '成功',
        warning: title || '警告',
        info: title || '提示'
    };

    toast.innerHTML = `
        <div class="toast-icon">${icons[type]}</div>
        <div class="toast-content">
            <div class="toast-title">${titles[type]}</div>
            <div class="toast-message">${message}</div>
        </div>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// 模拟状态
const state = {
    totalFunds: 100000,
    initialFundsCalc: 0, // Date Min Price * Initial Stocks
    remainingFunds: 100000,
    heldStocks: 0,
    initialStockCount: 100,
    currentStockCount: 100, // Amount to buy next
    currentIndex: 0,
    strategy: 'close',
    history: []
};

// DOM 元素引用
const elements = {
    fetchBtn: document.getElementById('fetch-btn'),
    startBtn: document.getElementById('start-btn'),
    resetBtn: document.getElementById('reset-btn'),
    stockCodeInput: document.getElementById('stock-code'),
    startDateInput: document.getElementById('start-date'),
    endDateInput: document.getElementById('end-date'),
    strategyInput: document.getElementById('strategy'),
    totalFundsInput: document.getElementById('total-funds'),
    initialStockCountInput: document.getElementById('initial-stock-count'),
    simulationIntervalInput: document.getElementById('simulation-interval'),

    currentPriceEl: document.getElementById('current-price'),
    currentFundsEl: document.getElementById('current-funds'),
    remainingFundsEl: document.getElementById('remaining-funds'),
    heldStocksEl: document.getElementById('held-stocks'),
    totalAssetEl: document.getElementById('total-asset'),
    finalValueEl: document.getElementById('final-value'),

    statusEl: document.getElementById('simulation-status'),
    resultDisplay: document.getElementById('result-display'),

    tableBody: document.getElementById('table-body'),
    dataCount: document.getElementById('data-count')
};

// 初始化图表
function initChart() {
    const ctx = document.getElementById('funds-chart').getContext('2d');

    chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: '总资产 (市值+现金)',
                data: [],
                borderColor: 'rgba(76, 201, 240, 0.8)',
                backgroundColor: 'rgba(76, 201, 240, 0.1)',
                borderWidth: 2,
                pointRadius: 0,
                fill: true,
                tension: 0.1
            }, {
                label: '股票市值',
                data: [],
                borderColor: 'rgba(255, 99, 132, 0.8)',
                borderWidth: 1,
                pointRadius: 0,
                fill: false,
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: 0 },
            layout: { padding: 0 },
            scales: {
                y: {
                    beginAtZero: false,
                    grid: { color: 'rgba(100, 100, 200, 0.1)' },
                    ticks: { color: 'rgba(255, 255, 255, 0.5)' }
                },
                x: {
                    display: true,
                    ticks: { color: 'rgba(255, 255, 255, 0.5)', maxTicksLimit: 10 }
                }
            },
            plugins: {
                tooltip: {
                    mode: 'index',
                    intersect: false
                }
            }
        }
    });
}

async function fetchStockData() {
    // Debounce check
    if (fetchButtonDebounce) {
        showToast('请等待3秒后再次获取数据', 'warning', '操作过快');
        return false;
    }

    const code = elements.stockCodeInput.value.trim();
    const startDate = elements.startDateInput.value.trim();
    const endDate = elements.endDateInput.value.trim();

    // Validate inputs
    if (!code) {
        showToast('请输入股票代码', 'warning', '输入验证');
        return false;
    }

    if (!startDate) {
        showToast('请输入开始日期 (格式: YYYY-MM-DD)', 'warning', '输入验证');
        return false;
    }

    if (!endDate) {
        showToast('请输入结束日期 (格式: YYYY-MM-DD)', 'warning', '输入验证');
        return false;
    }

    // Validate date format (basic check)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(startDate)) {
        showToast('开始日期格式不正确，请使用 YYYY-MM-DD 格式', 'error', '格式错误');
        return false;
    }

    if (!dateRegex.test(endDate)) {
        showToast('结束日期格式不正确，请使用 YYYY-MM-DD 格式', 'error', '格式错误');
        return false;
    }

    // Set debounce flag
    fetchButtonDebounce = true;
    setTimeout(() => {
        fetchButtonDebounce = false;
    }, 3000);

    // Reset table scroll position
    const tableWrapper = document.getElementById('data-table-wrapper');
    if (tableWrapper) {
        tableWrapper.scrollTop = 0;
    }

    elements.statusEl.textContent = "正在获取数据...";

    try {
        const response = await fetch('/api/stock_data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code, start_date: startDate, end_date: endDate })
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || "Fetch failed");
        }

        stockData = await response.json();
        populateDataTable();

        // Reset scroll position again after populating
        if (tableWrapper) {
            tableWrapper.scrollTop = 0;
        }

        elements.statusEl.textContent = `成功获取 ${stockData.length} 天数据`;
        showToast(`成功获取 ${stockData.length} 天股票数据`, 'success');
        return true;
    } catch (e) {
        // Clear table on error
        stockData = [];
        populateDataTable();

        // Reset scroll position
        if (tableWrapper) {
            tableWrapper.scrollTop = 0;
        }

        showToast(e.message, 'error', '数据获取失败');
        elements.statusEl.textContent = "数据获取失败";
        return false;
    }
}

function populateDataTable() {
    if (!stockData || stockData.length === 0) {
        elements.tableBody.innerHTML = '<tr><td colspan="6" class="no-data">暂无数据</td></tr>';
        elements.dataCount.textContent = '暂无数据';
        return;
    }

    elements.dataCount.textContent = `共 ${stockData.length} 条记录`;

    let html = '';
    stockData.forEach(row => {
        html += `<tr>
            <td>${row.date}</td>
            <td>${parseFloat(row.open).toFixed(2)}</td>
            <td>${parseFloat(row.high).toFixed(2)}</td>
            <td>${parseFloat(row.low).toFixed(2)}</td>
            <td>${parseFloat(row.close).toFixed(2)}</td>
            <td>${row.volume || '-'}</td>
        </tr>`;
    });

    elements.tableBody.innerHTML = html;
}

function getPrice(dayData, strategy) {
    switch (strategy) {
        case 'open': return parseFloat(dayData.open);
        case 'high': return parseFloat(dayData.high);
        case 'low': return parseFloat(dayData.low);
        case 'close': return parseFloat(dayData.close);
        case 'avg': return (parseFloat(dayData.high) + parseFloat(dayData.low)) / 2;
        default: return parseFloat(dayData.close);
    }
}

function resetSimulation() {
    clearInterval(simulationInterval);
    simulationRunning = false;
    stockData = [];
    state.currentIndex = 0;
    state.history = [];
    chart.data.labels = [];
    chart.data.datasets[0].data = [];
    chart.data.datasets[1].data = [];
    chart.update();
    elements.statusEl.textContent = "就绪";

    // Reset UI Values
    elements.currentPriceEl.textContent = "0.00";
    elements.currentFundsEl.textContent = "0";
    elements.remainingFundsEl.textContent = elements.totalFundsInput.value;
    elements.heldStocksEl.textContent = "0";
    elements.totalAssetEl.textContent = elements.totalFundsInput.value;
    elements.finalValueEl.textContent = "0";
    elements.resultDisplay.style.display = 'none';
    populateDataTable(); // Clear or re-render table
}

async function startSimulation() {
    if (simulationRunning) return;

    // Check if data is already loaded
    if (!stockData || stockData.length === 0) {
        const success = await fetchStockData();
        if (!success) return;
    }

    // Init Parameters
    state.totalFunds = parseFloat(elements.totalFundsInput.value);
    state.heldStocks = 0;
    state.initialStockCount = parseInt(elements.initialStockCountInput.value);
    state.strategy = elements.strategyInput.value;
    state.currentIndex = 0;

    // Initial State Check
    // The requirement says:
    // 4. 界面初始资金修改为：初始股数 ... 根据csv最小日期数据*初始股数计算出当前资金
    // 5. ... 总资金需要大于等于当前资金

    const firstDay = stockData[0];
    // Always use opening price for initial purchase
    const initialPrice = parseFloat(firstDay.open);
    const requiredInitialFunds = initialPrice * state.initialStockCount;
    state.initialFundsCalc = requiredInitialFunds;

    if (state.totalFunds < requiredInitialFunds) {
        showToast(
            `需要至少 ${requiredInitialFunds.toFixed(2)} 元<br>当前股价: ${initialPrice.toFixed(2)}<br>初始股数: ${state.initialStockCount}`,
            'error',
            '总资金不足'
        );
        return;
    }

    // First Buy - always at opening price
    state.remainingFunds = state.totalFunds - requiredInitialFunds;
    state.heldStocks = state.initialStockCount;
    state.currentStockCount = state.initialStockCount; // Base bet

    // Prepare Chart
    chart.data.labels = [];
    chart.data.datasets[0].data = [];
    chart.data.datasets[1].data = [];

    // Add first day data to chart
    const firstMarketValue = state.heldStocks * initialPrice;
    const firstTotalAsset = state.remainingFunds + firstMarketValue;
    chart.data.labels.push(firstDay.date);
    chart.data.datasets[0].data.push(firstTotalAsset);
    chart.data.datasets[1].data.push(firstMarketValue);

    // Update UI with first day data
    elements.currentPriceEl.textContent = initialPrice.toFixed(2);
    elements.heldStocksEl.textContent = state.heldStocks;
    elements.remainingFundsEl.textContent = state.remainingFunds.toFixed(2);
    elements.currentFundsEl.textContent = firstMarketValue.toFixed(2);
    elements.totalAssetEl.textContent = firstTotalAsset.toFixed(2);

    simulationRunning = true;
    elements.statusEl.textContent = "回测运行中...";

    // Get simulation interval from input
    const intervalMs = parseInt(elements.simulationIntervalInput.value) || 100;

    // Start from index 1 (second data point) for doubling logic
    state.currentIndex = 1;

    // Start Interval
    simulationInterval = setInterval(runSimulationStep, intervalMs);
}

function runSimulationStep() {
    if (state.currentIndex >= stockData.length) {
        finishSimulation();
        return;
    }

    const dayData = stockData[state.currentIndex];
    const price = getPrice(dayData, state.strategy);

    // Logic for Doubling:
    // Need comparison with PREVIOUS day to decide Win/Loss logic
    // But for the very first day (index 0), we just established the position.
    // So we start checking win/loss from index 1.

    if (state.currentIndex > 0) {
        const prevData = stockData[state.currentIndex - 1];
        const prevPrice = getPrice(prevData, state.strategy);

        // 赢: 次日继续初始投注 | 输:次日加倍投注
        const isWin = price >= prevPrice; // Price went up or stayed (Win)

        let buyAmount = 0;

        if (state.remainingFunds > 0) {
            if (isWin) {
                // Win: Reset to initial bet
                state.currentStockCount = state.initialStockCount;
            } else {
                // Lose: Double the bet
                state.currentStockCount *= 2;
            }

            // Check if we can afford the buy
            // Cost = Price * Count
            const cost = price * state.currentStockCount;

            if (state.remainingFunds >= cost) {
                buyAmount = state.currentStockCount;
            } else {
                // Buy as much as possible? Or stop doubling?
                // Req: "直到剩余资金为0不再倍投"
                // We'll buy max possible if we can't afford full double
                buyAmount = Math.floor(state.remainingFunds / price);
                state.currentStockCount = state.initialStockCount; // Reset logic might needed here or just drain
            }

            if (buyAmount > 0) {
                state.remainingFunds -= (buyAmount * price);
                state.heldStocks += buyAmount;
            }
        }
    }

    // Update Stats
    const marketValue = state.heldStocks * price;
    const totalAsset = state.remainingFunds + marketValue;

    updateUI(dayData.date, price, marketValue, totalAsset);

    state.history.push(totalAsset);

    state.currentIndex++;
}

function updateUI(date, price, marketValue, totalAsset) {
    elements.currentPriceEl.textContent = price.toFixed(2);
    elements.heldStocksEl.textContent = state.heldStocks;
    elements.remainingFundsEl.textContent = state.remainingFunds.toFixed(2);
    elements.currentFundsEl.textContent = marketValue.toFixed(2);
    elements.totalAssetEl.textContent = totalAsset.toFixed(2);

    chart.data.labels.push(date);
    chart.data.datasets[0].data.push(totalAsset);
    chart.data.datasets[1].data.push(marketValue);

    // Limit chart data points if too long for performance
    // (Optional, simplified for now)

    if (state.currentIndex % 5 === 0) {
        chart.update();
    }
}

function finishSimulation() {
    clearInterval(simulationInterval);
    simulationRunning = false;
    chart.update();
    elements.statusEl.textContent = "模拟完成";

    // Calculate final value
    const lastData = stockData[stockData.length - 1];
    const lastPrice = getPrice(lastData, state.strategy);
    const finalStockValue = state.heldStocks * lastPrice;
    const totalAssetFinal = finalStockValue + state.remainingFunds;

    // Calculate profit/loss
    const profitLoss = totalAssetFinal - state.totalFunds;
    const isProfit = profitLoss >= 0;

    // Update final value display with color
    elements.finalValueEl.textContent = finalStockValue.toFixed(2);
    elements.finalValueEl.style.color = isProfit ? '#ff4444' : '#00ff00'; // Red for profit, Green for loss

    // Update result display
    const resultText = isProfit
        ? `盈利 ${profitLoss.toFixed(2)} 元 (最终股票价值: ${finalStockValue.toFixed(2)})`
        : `亏损 ${Math.abs(profitLoss).toFixed(2)} 元 (最终股票价值: ${finalStockValue.toFixed(2)})`;

    elements.resultDisplay.textContent = resultText;
    elements.resultDisplay.className = isProfit ? "result win" : "result loss";
    elements.resultDisplay.style.display = 'block';
}

function initEventListeners() {
    elements.fetchBtn.addEventListener('click', async () => {
        await fetchStockData();
    });
    elements.startBtn.addEventListener('click', startSimulation);
    elements.resetBtn.addEventListener('click', resetSimulation);
}

// Init
window.addEventListener('load', () => {
    initChart();
    initEventListeners();
});