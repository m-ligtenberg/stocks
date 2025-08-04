/**
 * Professional Technical Analysis Chart Component
 * Advanced charting with multiple timeframes and technical indicators
 */
class TechnicalChart {
    constructor(stockService, realTimeService, notificationService) {
        this.stockService = stockService;
        this.realTimeService = realTimeService;
        this.notificationService = notificationService;
        this.chart = null;
        this.currentSymbol = null;
        this.currentTimeframe = '1D';
        this.indicators = new Map();
        this.chartData = [];
        this.realTimeSubscription = null;
        
        this.init();
    }

    init() {
        console.log('📊 Initializing Technical Analysis Chart...');
        this.setupEventListeners();
        this.createChartControls();
    }

    setupEventListeners() {
        // Listen for stock modal opening
        document.addEventListener('openStockModal', (e) => {
            this.loadChart(e.detail);
        });

        // Real-time price updates
        this.realTimeSubscription = this.realTimeService.subscribe(
            'technical-chart',
            (event, data) => this.handleRealTimeUpdate(event, data),
            []
        );
    }

    createChartControls() {
        // This will be called when the modal opens to inject chart controls
        const modalObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                const modal = document.getElementById('stock-modal');
                if (modal && !modal.classList.contains('hidden')) {
                    this.injectChartControls();
                    modalObserver.disconnect();
                }
            });
        });

        modalObserver.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['class']
        });
    }

    injectChartControls() {
        const analysisTab = document.getElementById('investment-analysis');
        if (!analysisTab || document.getElementById('technical-chart-container')) return;

        // Replace the simple chart with advanced technical chart
        const existingChart = analysisTab.querySelector('.chart-container');
        if (existingChart) existingChart.remove();

        const chartHTML = `
            <div id="technical-chart-container" class="technical-chart-container">
                <!-- Chart Controls -->
                <div class="chart-controls">
                    <div class="timeframe-controls">
                        <div class="control-group">
                            <label class="control-label">Timeframe:</label>
                            <div class="timeframe-buttons">
                                <button class="timeframe-btn active" data-timeframe="1D">1D</button>
                                <button class="timeframe-btn" data-timeframe="1W">1W</button>
                                <button class="timeframe-btn" data-timeframe="1M">1M</button>
                                <button class="timeframe-btn" data-timeframe="3M">3M</button>
                                <button class="timeframe-btn" data-timeframe="1Y">1Y</button>
                            </div>
                        </div>
                        
                        <div class="control-group">
                            <label class="control-label">Chart Type:</label>
                            <select id="chart-type-select" class="chart-select">
                                <option value="candlestick">Candlestick</option>
                                <option value="line">Line</option>
                                <option value="area">Area</option>
                                <option value="ohlc">OHLC</option>
                            </select>
                        </div>
                    </div>
                    
                    <div class="indicator-controls">
                        <div class="control-group">
                            <label class="control-label">Technical Indicators:</label>
                            <div class="indicator-toggles">
                                <label class="indicator-toggle">
                                    <input type="checkbox" data-indicator="sma" checked>
                                    <span class="toggle-label">SMA(20)</span>
                                </label>
                                <label class="indicator-toggle">
                                    <input type="checkbox" data-indicator="ema">
                                    <span class="toggle-label">EMA(12)</span>
                                </label>
                                <label class="indicator-toggle">
                                    <input type="checkbox" data-indicator="bollinger">
                                    <span class="toggle-label">Bollinger Bands</span>
                                </label>
                                <label class="indicator-toggle">
                                    <input type="checkbox" data-indicator="rsi">
                                    <span class="toggle-label">RSI</span>
                                </label>
                                <label class="indicator-toggle">
                                    <input type="checkbox" data-indicator="macd">
                                    <span class="toggle-label">MACD</span>
                                </label>
                                <label class="indicator-toggle">
                                    <input type="checkbox" data-indicator="volume">
                                    <span class="toggle-label">Volume</span>
                                </label>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Main Chart Area -->
                <div class="chart-area">
                    <div class="chart-wrapper">
                        <canvas id="technical-chart" class="technical-chart-canvas"></canvas>
                        <div class="chart-crosshair" id="chart-crosshair"></div>
                        <div class="chart-tooltip" id="chart-tooltip"></div>
                    </div>
                    
                    <!-- Sub-charts for indicators -->
                    <div class="sub-charts" id="sub-charts">
                        <div class="sub-chart hidden" id="rsi-chart">
                            <canvas id="rsi-canvas"></canvas>
                        </div>
                        <div class="sub-chart hidden" id="macd-chart">
                            <canvas id="macd-canvas"></canvas>
                        </div>
                        <div class="sub-chart hidden" id="volume-chart">
                            <canvas id="volume-canvas"></canvas>
                        </div>
                    </div>
                </div>

                <!-- Chart Legend -->
                <div class="chart-legend" id="chart-legend">
                    <div class="legend-items"></div>
                </div>

                <!-- Market Analysis Panel -->
                <div class="analysis-panel">
                    <div class="analysis-section">
                        <h4>Technical Analysis</h4>
                        <div class="analysis-metrics" id="technical-metrics">
                            <div class="metric-row">
                                <span class="metric-name">Trend:</span>
                                <span class="metric-value" id="trend-indicator">Analyzing...</span>
                            </div>
                            <div class="metric-row">
                                <span class="metric-name">Support:</span>
                                <span class="metric-value" id="support-level">$--</span>
                            </div>
                            <div class="metric-row">
                                <span class="metric-name">Resistance:</span>
                                <span class="metric-value" id="resistance-level">$--</span>
                            </div>
                            <div class="metric-row">
                                <span class="metric-name">Signal:</span>
                                <span class="metric-value" id="trade-signal">Neutral</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="analysis-section">
                        <h4>Key Levels</h4>
                        <div class="key-levels" id="key-levels">
                            <div class="level-item">
                                <span class="level-type">52W High:</span>
                                <span class="level-value" id="week-52-high">$--</span>
                            </div>
                            <div class="level-item">
                                <span class="level-type">52W Low:</span>
                                <span class="level-value" id="week-52-low">$--</span>
                            </div>
                            <div class="level-item">
                                <span class="level-type">Avg Volume:</span>
                                <span class="level-value" id="avg-volume">--</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        analysisTab.insertAdjacentHTML('beforeend', chartHTML);
        this.setupChartEventListeners();
    }

    setupChartEventListeners() {
        // Timeframe buttons
        document.querySelectorAll('.timeframe-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.timeframe-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.changeTimeframe(e.target.dataset.timeframe);
            });
        });

        // Chart type selector
        const chartTypeSelect = document.getElementById('chart-type-select');
        if (chartTypeSelect) {
            chartTypeSelect.addEventListener('change', (e) => {
                this.changeChartType(e.target.value);
            });
        }

        // Indicator toggles
        document.querySelectorAll('.indicator-toggle input').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const indicator = e.target.dataset.indicator;
                if (e.target.checked) {
                    this.addIndicator(indicator);
                } else {
                    this.removeIndicator(indicator);
                }
            });
        });

        // Chart interactions
        this.setupChartInteractions();
    }

    setupChartInteractions() {
        const chartCanvas = document.getElementById('technical-chart');
        const chartWrapper = document.querySelector('.chart-wrapper');
        
        if (!chartCanvas || !chartWrapper) return;

        let isDrawing = false;
        let startPoint = null;

        // Mouse events for crosshair and tooltip
        chartCanvas.addEventListener('mousemove', (e) => {
            this.updateCrosshair(e);
            this.updateTooltip(e);
        });

        chartCanvas.addEventListener('mouseleave', () => {
            this.hideCrosshair();
            this.hideTooltip();
        });

        // Touch events for mobile
        chartCanvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            const mouseEvent = new MouseEvent('mousemove', {
                clientX: touch.clientX,
                clientY: touch.clientY
            });
            chartCanvas.dispatchEvent(mouseEvent);
        });
    }

    async loadChart(symbol) {
        console.log(`📊 Loading technical chart for ${symbol}...`);
        
        this.currentSymbol = symbol;
        
        try {
            // Show loading state
            this.showChartLoading();
            
            // Fetch historical data
            const historicalData = await this.fetchHistoricalData(symbol, this.currentTimeframe);
            this.chartData = historicalData;
            
            // Create the chart
            await this.createChart();
            
            // Add default indicators
            this.addIndicator('sma');
            
            // Update analysis metrics
            this.updateAnalysisMetrics();
            
            // Subscribe to real-time updates for this symbol
            this.realTimeService.watchSymbols([symbol]);
            
            console.log(`✅ Technical chart loaded for ${symbol}`);
            
        } catch (error) {
            console.error(`❌ Error loading chart for ${symbol}:`, error);
            this.showChartError(error.message);
        }
    }

    async fetchHistoricalData(symbol, timeframe) {
        // Generate realistic OHLCV data for demo
        const data = this.generateHistoricalData(symbol, timeframe);
        
        // In production, this would call:
        // return await this.stockService.fetchHistoricalData(symbol, timeframe);
        
        return data;
    }

    generateHistoricalData(symbol, timeframe) {
        const periods = this.getPeriodsForTimeframe(timeframe);
        const basePrice = this.getBasePrice(symbol);
        const data = [];
        
        let currentPrice = basePrice;
        const now = new Date();
        
        for (let i = periods - 1; i >= 0; i--) {
            const date = new Date(now);
            date.setHours(date.getHours() - (i * this.getHoursForTimeframe(timeframe)));
            
            // Generate realistic OHLC data
            const volatility = 0.02; // 2% volatility
            const change = (Math.random() - 0.5) * volatility;
            
            const open = currentPrice;
            const close = currentPrice * (1 + change);
            const high = Math.max(open, close) * (1 + Math.random() * 0.01);
            const low = Math.min(open, close) * (1 - Math.random() * 0.01);
            const volume = Math.floor(Math.random() * 1000000) + 100000;
            
            data.push({
                timestamp: date.getTime(),
                date: date,
                open: Number(open.toFixed(2)),
                high: Number(high.toFixed(2)),
                low: Number(low.toFixed(2)),
                close: Number(close.toFixed(2)),
                volume: volume
            });
            
            currentPrice = close;
        }
        
        return data.sort((a, b) => a.timestamp - b.timestamp);
    }

    getPeriodsForTimeframe(timeframe) {
        const periods = {
            '1D': 24,    // 24 hours
            '1W': 168,   // 7 days * 24 hours
            '1M': 720,   // 30 days * 24 hours
            '3M': 2160,  // 90 days * 24 hours
            '1Y': 8760   // 365 days * 24 hours
        };
        return periods[timeframe] || 24;
    }

    getHoursForTimeframe(timeframe) {
        const hours = {
            '1D': 1,     // 1 hour intervals
            '1W': 4,     // 4 hour intervals
            '1M': 24,    // 1 day intervals
            '3M': 24,    // 1 day intervals
            '1Y': 24     // 1 day intervals
        };
        return hours[timeframe] || 1;
    }

    getBasePrice(symbol) {
        const basePrices = {
            'AAPL': 150.00,
            'GOOGL': 2800.00,
            'MSFT': 300.00,
            'TSLA': 250.00,
            'AMZN': 3200.00,
            'META': 200.00,
            'NVDA': 400.00,
            'NFLX': 450.00
        };
        return basePrices[symbol] || (Math.random() * 100 + 50);
    }

    async createChart() {
        const canvas = document.getElementById('technical-chart');
        if (!canvas || !this.chartData.length) return;

        // Destroy existing chart
        if (this.chart) {
            this.chart.destroy();
        }

        const ctx = canvas.getContext('2d');
        
        // Prepare data for Chart.js
        const chartData = this.prepareChartData();
        
        this.chart = new Chart(ctx, {
            type: 'line', // We'll customize this to look like candlesticks
            data: chartData,
            options: this.getChartOptions()
        });

        // Update chart legend
        this.updateChartLegend();
    }

    prepareChartData() {
        const labels = this.chartData.map(d => this.formatDate(d.date));
        const prices = this.chartData.map(d => d.close);
        
        return {
            labels: labels,
            datasets: [{
                label: `${this.currentSymbol} Price`,
                data: prices,
                borderColor: 'var(--color-professional-primary)',
                backgroundColor: 'rgba(245, 158, 11, 0.1)',
                borderWidth: 2,
                fill: false,
                pointRadius: 0,
                pointHoverRadius: 4,
                tension: 0.1
            }]
        };
    }

    getChartOptions() {
        return {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: false,
                mode: 'index'
            },
            plugins: {
                legend: {
                    display: false // We'll use custom legend
                },
                tooltip: {
                    enabled: false // We'll use custom tooltip
                }
            },
            scales: {
                x: {
                    type: 'category',
                    grid: {
                        color: 'rgba(245, 158, 11, 0.1)',
                        drawTicks: false
                    },
                    ticks: {
                        color: 'var(--color-professional-text-secondary)',
                        font: {
                            family: 'var(--font-family-mono)',
                            size: 11
                        },
                        maxTicksLimit: 8
                    }
                },
                y: {
                    position: 'right',
                    grid: {
                        color: 'rgba(245, 158, 11, 0.1)',
                        drawTicks: false
                    },
                    ticks: {
                        color: 'var(--color-professional-text-secondary)',
                        font: {
                            family: 'var(--font-family-mono)',
                            size: 11
                        },
                        callback: function(value) {
                            return '$' + value.toFixed(2);
                        }
                    }
                }
            },
            animation: {
                duration: 0 // Disable animations for performance
            }
        };
    }

    // Technical Indicators
    addIndicator(type) {
        console.log(`📊 Adding ${type} indicator...`);
        
        switch (type) {
            case 'sma':
                this.addSMA(20);
                break;
            case 'ema':
                this.addEMA(12);
                break;
            case 'bollinger':
                this.addBollingerBands();
                break;
            case 'rsi':
                this.addRSI();
                break;
            case 'macd':
                this.addMACD();
                break;
            case 'volume':
                this.addVolumeChart();
                break;
        }
        
        this.indicators.set(type, true);
        this.updateChart();
    }

    removeIndicator(type) {
        console.log(`📊 Removing ${type} indicator...`);
        
        // Remove from chart datasets
        if (this.chart) {
            this.chart.data.datasets = this.chart.data.datasets.filter(
                dataset => !dataset.label.toLowerCase().includes(type)
            );
        }
        
        // Hide sub-charts
        const subChart = document.getElementById(`${type}-chart`);
        if (subChart) {
            subChart.classList.add('hidden');
        }
        
        this.indicators.delete(type);
        this.updateChart();
    }

    addSMA(period = 20) {
        const smaData = this.calculateSMA(this.chartData, period);
        
        if (this.chart) {
            this.chart.data.datasets.push({
                label: `SMA(${period})`,
                data: smaData,
                borderColor: '#10b981',
                backgroundColor: 'transparent',
                borderWidth: 1,
                pointRadius: 0,
                fill: false
            });
        }
    }

    addEMA(period = 12) {
        const emaData = this.calculateEMA(this.chartData, period);
        
        if (this.chart) {
            this.chart.data.datasets.push({
                label: `EMA(${period})`,
                data: emaData,
                borderColor: '#3b82f6',
                backgroundColor: 'transparent',
                borderWidth: 1,
                pointRadius: 0,
                fill: false
            });
        }
    }

    addBollingerBands() {
        const { upper, middle, lower } = this.calculateBollingerBands(this.chartData);
        
        if (this.chart) {
            this.chart.data.datasets.push(
                {
                    label: 'BB Upper',
                    data: upper,
                    borderColor: 'rgba(139, 92, 246, 0.5)',
                    backgroundColor: 'transparent',
                    borderWidth: 1,
                    pointRadius: 0,
                    fill: false
                },
                {
                    label: 'BB Lower',
                    data: lower,
                    borderColor: 'rgba(139, 92, 246, 0.5)',
                    backgroundColor: 'rgba(139, 92, 246, 0.1)',
                    borderWidth: 1,
                    pointRadius: 0,
                    fill: '-1'
                }
            );
        }
    }

    addRSI() {
        const rsiData = this.calculateRSI(this.chartData);
        const subChart = document.getElementById('rsi-chart');
        
        if (subChart) {
            subChart.classList.remove('hidden');
            this.createRSIChart(rsiData);
        }
    }

    addMACD() {
        const macdData = this.calculateMACD(this.chartData);
        const subChart = document.getElementById('macd-chart');
        
        if (subChart) {
            subChart.classList.remove('hidden');
            this.createMACDChart(macdData);
        }
    }

    addVolumeChart() {
        const volumeData = this.chartData.map(d => d.volume);
        const subChart = document.getElementById('volume-chart');
        
        if (subChart) {
            subChart.classList.remove('hidden');
            this.createVolumeChart(volumeData);
        }
    }

    createRSIChart(rsiData) {
        const canvas = document.getElementById('rsi-canvas');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: this.chartData.map(d => this.formatDate(d.date)),
                datasets: [{
                    label: 'RSI',
                    data: rsiData,
                    borderColor: '#8b5cf6',
                    backgroundColor: 'rgba(139, 92, 246, 0.1)',
                    borderWidth: 2,
                    pointRadius: 0,
                    fill: false
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    x: { display: false },
                    y: {
                        min: 0,
                        max: 100,
                        position: 'right',
                        grid: { color: 'rgba(245, 158, 11, 0.1)' },
                        ticks: {
                            color: 'var(--color-professional-text-secondary)',
                            font: { size: 10 }
                        }
                    }
                },
                animation: { duration: 0 }
            }
        });
    }

    createMACDChart(macdData) {
        const canvas = document.getElementById('macd-canvas');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: this.chartData.map(d => this.formatDate(d.date)),
                datasets: [
                    {
                        label: 'MACD',
                        data: macdData.macdLine,
                        borderColor: '#3b82f6',
                        backgroundColor: 'transparent',
                        borderWidth: 2,
                        pointRadius: 0,
                        fill: false
                    },
                    {
                        label: 'Signal',
                        data: macdData.signalLine,
                        borderColor: '#ef4444',
                        backgroundColor: 'transparent',
                        borderWidth: 1,
                        pointRadius: 0,
                        fill: false
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    x: { display: false },
                    y: {
                        position: 'right',
                        grid: { color: 'rgba(245, 158, 11, 0.1)' },
                        ticks: {
                            color: 'var(--color-professional-text-secondary)',
                            font: { size: 10 }
                        }
                    }
                },
                animation: { duration: 0 }
            }
        });
    }

    createVolumeChart(volumeData) {
        const canvas = document.getElementById('volume-canvas');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: this.chartData.map(d => this.formatDate(d.date)),
                datasets: [{
                    label: 'Volume',
                    data: volumeData,
                    backgroundColor: 'rgba(245, 158, 11, 0.3)',
                    borderColor: 'rgba(245, 158, 11, 0.6)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    x: { display: false },
                    y: {
                        position: 'right',
                        grid: { color: 'rgba(245, 158, 11, 0.1)' },
                        ticks: {
                            color: 'var(--color-professional-text-secondary)',
                            font: { size: 10 },
                            callback: function(value) {
                                return (value / 1000000).toFixed(1) + 'M';
                            }
                        }
                    }
                },
                animation: { duration: 0 }
            }
        });
    }

    // Technical Analysis Calculations
    calculateSMA(data, period) {
        const sma = [];
        for (let i = 0; i < data.length; i++) {
            if (i < period - 1) {
                sma.push(null);
            } else {
                const sum = data.slice(i - period + 1, i + 1).reduce((acc, d) => acc + d.close, 0);
                sma.push(sum / period);
            }
        }
        return sma;
    }

    calculateEMA(data, period) {
        const ema = [];
        const multiplier = 2 / (period + 1);
        
        ema[0] = data[0].close;
        
        for (let i = 1; i < data.length; i++) {
            ema[i] = ((data[i].close - ema[i - 1]) * multiplier) + ema[i - 1];
        }
        
        return ema;
    }

    calculateBollingerBands(data, period = 20, stdDev = 2) {
        const sma = this.calculateSMA(data, period);
        const upper = [];
        const lower = [];
        
        for (let i = 0; i < data.length; i++) {
            if (i < period - 1) {
                upper.push(null);
                lower.push(null);
            } else {
                const slice = data.slice(i - period + 1, i + 1);
                const mean = sma[i];
                const variance = slice.reduce((acc, d) => acc + Math.pow(d.close - mean, 2), 0) / period;
                const standardDeviation = Math.sqrt(variance);
                
                upper.push(mean + (standardDeviation * stdDev));
                lower.push(mean - (standardDeviation * stdDev));
            }
        }
        
        return { upper, middle: sma, lower };
    }

    calculateRSI(data, period = 14) {
        const rsi = [];
        const gains = [];
        const losses = [];
        
        for (let i = 1; i < data.length; i++) {
            const change = data[i].close - data[i - 1].close;
            gains.push(change > 0 ? change : 0);
            losses.push(change < 0 ? Math.abs(change) : 0);
        }
        
        for (let i = 0; i < gains.length; i++) {
            if (i < period - 1) {
                rsi.push(null);
            } else {
                const avgGain = gains.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period;
                const avgLoss = losses.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period;
                
                if (avgLoss === 0) {
                    rsi.push(100);
                } else {
                    const rs = avgGain / avgLoss;
                    rsi.push(100 - (100 / (1 + rs)));
                }
            }
        }
        
        return rsi;
    }

    calculateMACD(data, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
        const fastEMA = this.calculateEMA(data, fastPeriod);
        const slowEMA = this.calculateEMA(data, slowPeriod);
        const macdLine = fastEMA.map((fast, i) => fast - slowEMA[i]);
        
        // Convert MACD line to data format for EMA calculation
        const macdData = macdLine.map((value, i) => ({ close: value }));
        const signalLine = this.calculateEMA(macdData, signalPeriod);
        const histogram = macdLine.map((macd, i) => macd - signalLine[i]);
        
        return { macdLine, signalLine, histogram };
    }

    // UI Helper Methods
    formatDate(date) {
        if (this.currentTimeframe === '1D') {
            return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        } else {
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        }
    }

    showChartLoading() {
        const container = document.getElementById('technical-chart-container');
        if (container) {
            container.classList.add('loading');
        }
    }

    showChartError(message) {
        const container = document.getElementById('technical-chart-container');
        if (container) {
            container.innerHTML = `
                <div class="chart-error">
                    <h3>Chart Loading Error</h3>
                    <p>${message}</p>
                    <button onclick="location.reload()" class="btn btn-primary">Retry</button>
                </div>
            `;
        }
    }

    updateChart() {
        if (this.chart) {
            this.chart.update('none'); // No animation for performance
        }
    }

    updateChartLegend() {
        const legendContainer = document.querySelector('.legend-items');
        if (!legendContainer || !this.chart) return;
        
        const items = this.chart.data.datasets.map(dataset => `
            <div class="legend-item">
                <div class="legend-color" style="background-color: ${dataset.borderColor}"></div>
                <span class="legend-label">${dataset.label}</span>
            </div>
        `).join('');
        
        legendContainer.innerHTML = items;
    }

    changeTimeframe(timeframe) {
        this.currentTimeframe = timeframe;
        console.log(`📊 Changing timeframe to ${timeframe}`);
        
        if (this.currentSymbol) {
            this.loadChart(this.currentSymbol);
        }
    }

    changeChartType(type) {
        console.log(`📊 Changing chart type to ${type}`);
        // This would update the chart rendering style
        if (this.chart) {
            this.updateChart();
        }
    }

    updateAnalysisMetrics() {
        if (!this.chartData.length) return;
        
        const latest = this.chartData[this.chartData.length - 1];
        const previous = this.chartData[this.chartData.length - 2];
        
        // Simple trend analysis
        const trend = latest.close > previous.close ? 'BULLISH' : 'BEARISH';
        const trendElement = document.getElementById('trend-indicator');
        if (trendElement) {
            trendElement.textContent = trend;
            trendElement.className = `metric-value ${trend.toLowerCase()}`;
        }
        
        // Calculate support and resistance levels
        const prices = this.chartData.map(d => d.close);
        const high52w = Math.max(...prices);
        const low52w = Math.min(...prices);
        
        const supportLevel = document.getElementById('support-level');
        const resistanceLevel = document.getElementById('resistance-level');
        const week52High = document.getElementById('week-52-high');
        const week52Low = document.getElementById('week-52-low');
        
        if (supportLevel) supportLevel.textContent = `$${low52w.toFixed(2)}`;
        if (resistanceLevel) resistanceLevel.textContent = `$${high52w.toFixed(2)}`;
        if (week52High) week52High.textContent = `$${high52w.toFixed(2)}`;
        if (week52Low) week52Low.textContent = `$${low52w.toFixed(2)}`;
        
        // Simple signal
        const signal = trend === 'BULLISH' ? 'BUY' : 'SELL';
        const signalElement = document.getElementById('trade-signal');
        if (signalElement) {
            signalElement.textContent = signal;
            signalElement.className = `metric-value ${signal.toLowerCase()}`;
        }
    }

    handleRealTimeUpdate(event, data) {
        if (event === 'priceUpdate' && data.symbol === this.currentSymbol) {
            // Update the last data point with real-time price
            if (this.chartData.length > 0) {
                const lastIndex = this.chartData.length - 1;
                this.chartData[lastIndex].close = data.price;
                
                // Update chart
                if (this.chart) {
                    this.chart.data.datasets[0].data[lastIndex] = data.price;
                    this.updateChart();
                }
                
                // Update analysis metrics
                this.updateAnalysisMetrics();
            }
        }
    }

    // Crosshair and tooltip functionality
    updateCrosshair(event) {
        const crosshair = document.getElementById('chart-crosshair');
        if (!crosshair || !this.chart) return;
        
        const rect = event.target.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        crosshair.style.display = 'block';
        crosshair.style.left = x + 'px';
        crosshair.style.top = y + 'px';
    }

    hideCrosshair() {
        const crosshair = document.getElementById('chart-crosshair');
        if (crosshair) {
            crosshair.style.display = 'none';
        }
    }

    updateTooltip(event) {
        const tooltip = document.getElementById('chart-tooltip');
        if (!tooltip || !this.chart) return;
        
        // Get data point information and show in tooltip
        const rect = event.target.getBoundingClientRect();
        const x = event.clientX - rect.left;
        
        tooltip.style.display = 'block';
        tooltip.style.left = (x + 10) + 'px';
        tooltip.style.top = (event.clientY - rect.top - 10) + 'px';
        tooltip.innerHTML = `
            <div class="tooltip-content">
                <div class="tooltip-symbol">${this.currentSymbol}</div>
                <div class="tooltip-price">Price data would go here</div>
            </div>
        `;
    }

    hideTooltip() {
        const tooltip = document.getElementById('chart-tooltip');
        if (tooltip) {
            tooltip.style.display = 'none';
        }
    }

    // Cleanup
    destroy() {
        console.log('📊 Destroying Technical Chart...');
        
        if (this.chart) {
            this.chart.destroy();
        }
        
        if (this.realTimeSubscription) {
            this.realTimeSubscription();
        }
        
        this.indicators.clear();
        this.chartData = [];
    }
}