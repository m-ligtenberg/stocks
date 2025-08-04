/**
 * Portfolio Dashboard Component
 * Professional portfolio visualization with charts, holdings, and performance metrics
 */
class PortfolioDashboard {
    constructor(
        portfolioService = window.lupoPortfolio,
        notificationService = window.lupoNotifications,
        realTimeService = window.lupoRealTime,
        config = window.lupoConfig
    ) {
        this.portfolioService = portfolioService;
        this.notificationService = notificationService;
        this.realTimeService = realTimeService;
        this.config = config;
        
        this.portfolio = null;
        this.portfolioChart = null;
        this.performanceChart = null;
        this.updateInterval = null;
        this.realTimeSubscription = null;
        
        this.init();
    }

    init() {
        console.log('📊 Initializing Portfolio Dashboard...');
        this.setupEventListeners();
        this.setupRealTimeUpdates();
        this.loadPortfolioData();
    }

    setupRealTimeUpdates() {
        // Subscribe to real-time price updates for portfolio holdings
        this.realTimeSubscription = this.realTimeService.subscribe(
            'portfolio-dashboard',
            (event, data) => this.handleRealTimeUpdate(event, data),
            []
        );
    }

    handleRealTimeUpdate(event, data) {
        if (event === 'priceUpdate' && this.portfolio) {
            // Update portfolio holdings with new prices
            this.updateHoldingPrices(data);
        }
    }

    updateHoldingPrices(priceData) {
        if (!this.portfolio?.holdings) return;

        const holding = this.portfolio.holdings.find(h => h.symbol === priceData.symbol);
        if (holding) {
            holding.currentPrice = priceData.price;
            
            // Recalculate metrics
            this.portfolio.metrics = this.portfolioService.calculatePortfolioMetrics(this.portfolio);
            
            // Update display
            this.renderPortfolioSummary();
            this.renderPortfolioHoldings();
            
            // Update chart if needed
            if (this.portfolioChart) {
                this.updatePortfolioChart();
            }
        }
    }

    setupEventListeners() {
        // Reset portfolio button
        document.addEventListener('click', (e) => {
            if (e.target.id === 'reset-portfolio' || e.target.closest('#reset-portfolio')) {
                this.handleResetPortfolio();
            }
        });

        // Portfolio updates
        document.addEventListener('portfolioUpdate', () => {
            this.loadPortfolioData();
        });

        // Window resize for charts
        window.addEventListener('resize', () => {
            if (this.portfolioChart) this.portfolioChart.resize();
            if (this.performanceChart) this.performanceChart.resize();
        });
    }

    async loadPortfolioData() {
        try {
            this.portfolio = await this.portfolioService.getPortfolio();
            this.render();
        } catch (error) {
            console.error('❌ Error loading portfolio data:', error);
            if (this.notificationService) {
                this.notificationService.error('Portfolio Error', 'Failed to load portfolio data');
            }
        }
    }

    render() {
        this.renderPortfolioSummary();
        this.renderPortfolioHoldings();
        this.renderTransactionHistory();
        this.createPortfolioChart();
        this.addPortfolioChartToHTML();
    }

    renderPortfolioSummary() {
        if (!this.portfolio) return;

        const portfolioValue = document.getElementById('portfolio-value');
        const availableCash = document.getElementById('available-cash');
        const totalPnL = document.getElementById('total-pnl');
        const totalPositions = document.getElementById('total-positions');

        if (portfolioValue) {
            portfolioValue.textContent = `$${this.portfolio.totalValue.toLocaleString('en-US', {minimumFractionDigits: 2})}`;
        }

        if (availableCash) {
            availableCash.textContent = `$${this.portfolio.cashBalance.toLocaleString('en-US', {minimumFractionDigits: 2})}`;
        }

        if (totalPnL) {
            const pnl = this.portfolio.totalValue - 10000; // Initial investment
            const pnlClass = pnl >= 0 ? 'var(--color-retail-positive)' : 'var(--color-retail-negative)';
            const pnlPrefix = pnl >= 0 ? '+' : '';
            totalPnL.textContent = `${pnlPrefix}$${pnl.toLocaleString('en-US', {minimumFractionDigits: 2})}`;
            totalPnL.style.color = pnlClass;
        }

        if (totalPositions) {
            const holdings = this.portfolio.holdings || [];
            totalPositions.textContent = holdings.length.toString();
        }
    }

    renderPortfolioHoldings() {
        const container = document.getElementById('portfolio-holdings');
        const emptyState = document.getElementById('empty-portfolio');
        
        if (!container || !this.portfolio) return;

        const holdings = this.portfolio.holdings || [];

        if (holdings.length === 0) {
            container.style.display = 'none';
            if (emptyState) emptyState.style.display = 'block';
            return;
        }

        container.style.display = 'grid';
        if (emptyState) emptyState.style.display = 'none';

        container.innerHTML = holdings.map(holding => this.createHoldingCard(holding)).join('');
    }

    createHoldingCard(holding) {
        const currentValue = holding.shares * holding.currentPrice;
        const totalPnL = currentValue - (holding.shares * holding.averagePrice);
        const pnlPercentage = ((holding.currentPrice - holding.averagePrice) / holding.averagePrice) * 100;
        
        const pnlClass = totalPnL >= 0 ? 'positive' : 'negative';
        const pnlPrefix = totalPnL >= 0 ? '+' : '';

        return `
            <div class="holding-card" data-symbol="${holding.symbol}">
                <div class="holding-header">
                    <div class="holding-info">
                        <h4 class="holding-symbol">${holding.symbol}</h4>
                        <p class="holding-name">${holding.name}</p>
                    </div>
                    <div class="holding-price">
                        <span class="current-price">$${holding.currentPrice.toFixed(2)}</span>
                        <span class="price-change ${pnlClass}">
                            ${pnlPrefix}${(holding.currentPrice - holding.averagePrice).toFixed(2)}
                        </span>
                    </div>
                </div>
                
                <div class="holding-metrics">
                    <div class="metric">
                        <span class="metric-label">Shares</span>
                        <span class="metric-value">${holding.shares}</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Avg Cost</span>
                        <span class="metric-value">$${holding.averagePrice.toFixed(2)}</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Market Value</span>
                        <span class="metric-value">$${currentValue.toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Total P&L</span>
                        <span class="metric-value ${pnlClass}">
                            ${pnlPrefix}$${Math.abs(totalPnL).toFixed(2)} (${pnlPrefix}${pnlPercentage.toFixed(1)}%)
                        </span>
                    </div>
                </div>
                
                <div class="holding-actions">
                    <button class="btn btn-sm btn-primary" data-action="analyze" data-symbol="${holding.symbol}">
                        📊 Analyze
                    </button>
                    <button class="btn btn-sm btn-secondary" data-action="buy-more" data-symbol="${holding.symbol}" data-price="${holding.currentPrice}">
                        ➕ Buy More
                    </button>
                    <button class="btn btn-sm btn-outline" data-action="sell" data-symbol="${holding.symbol}" data-price="${holding.currentPrice}">
                        ➖ Sell
                    </button>
                </div>
            </div>
        `;
    }

    renderTransactionHistory() {
        const container = document.getElementById('transaction-list');
        const emptyState = document.getElementById('empty-transactions');
        
        if (!container || !this.portfolio) return;

        const transactions = this.portfolio.transactions || [];

        if (transactions.length === 0) {
            if (emptyState) emptyState.style.display = 'block';
            return;
        }

        if (emptyState) emptyState.style.display = 'none';

        // Show last 10 transactions
        const recentTransactions = transactions.slice(-10).reverse();

        container.innerHTML = `
            <div class="transaction-header">
                <div class="transaction-col">Date</div>
                <div class="transaction-col">Type</div>
                <div class="transaction-col">Symbol</div>
                <div class="transaction-col">Shares</div>
                <div class="transaction-col">Price</div>
                <div class="transaction-col">Total</div>
            </div>
            ${recentTransactions.map(tx => `
                <div class="transaction-row">
                    <div class="transaction-col">
                        <span class="transaction-date">${new Date(tx.timestamp).toLocaleDateString()}</span>
                        <small class="transaction-time">${new Date(tx.timestamp).toLocaleTimeString()}</small>
                    </div>
                    <div class="transaction-col">
                        <span class="transaction-type ${tx.type.toLowerCase()}">${tx.type.toUpperCase()}</span>
                    </div>
                    <div class="transaction-col">
                        <strong>${tx.symbol}</strong>
                    </div>
                    <div class="transaction-col">${tx.shares}</div>
                    <div class="transaction-col">$${tx.price.toFixed(2)}</div>
                    <div class="transaction-col">
                        <span class="transaction-total ${tx.type.toLowerCase()}">
                            ${tx.type === 'buy' ? '-' : '+'}$${tx.total.toFixed(2)}
                        </span>
                    </div>
                </div>
            `).join('')}
        `;
    }

    addPortfolioChartToHTML() {
        // Add portfolio chart section if it doesn't exist
        const portfolioSection = document.getElementById('my-portfolio');
        if (!portfolioSection || document.getElementById('portfolio-chart-section')) return;

        const chartSection = `
            <div id="portfolio-chart-section" class="portfolio-chart-section" style="background: var(--color-professional-surface); border-radius: var(--radius-lg); padding: var(--space-24); margin-bottom: var(--space-24); border: 1px solid rgba(245, 158, 11, 0.2);">
                <h3 style="margin-bottom: var(--space-20); color: var(--color-professional-text);">Asset Allocation</h3>
                <div style="height: 300px; position: relative;">
                    <canvas id="portfolio-chart"></canvas>
                </div>
            </div>
        `;

        // Insert after portfolio summary
        const portfolioSummary = portfolioSection.querySelector('.portfolio-summary');
        if (portfolioSummary) {
            portfolioSummary.insertAdjacentHTML('afterend', chartSection);
        }
    }

    createPortfolioChart() {
        // Wait for chart section to be added
        setTimeout(() => {
            const canvas = document.getElementById('portfolio-chart');
            if (!canvas || !this.portfolio) return;

            const ctx = canvas.getContext('2d');
            const holdings = this.portfolio.holdings || [];

            if (holdings.length === 0) return;

            // Destroy existing chart
            if (this.portfolioChart) {
                this.portfolioChart.destroy();
            }

            const data = holdings.map(holding => ({
                symbol: holding.symbol,
                value: holding.shares * holding.currentPrice
            }));

            this.portfolioChart = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: data.map(d => d.symbol),
                    datasets: [{
                        data: data.map(d => d.value),
                        backgroundColor: [
                            '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', 
                            '#ef4444', '#06b6d4', '#84cc16', '#f97316',
                            '#ec4899', '#14b8a6', '#f97316', '#8b5cf6'
                        ],
                        borderWidth: 2,
                        borderColor: 'var(--color-professional-dark)'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'right',
                            labels: {
                                color: 'var(--color-professional-text)',
                                font: {
                                    family: 'var(--font-family-base)',
                                    size: 12
                                },
                                generateLabels: function(chart) {
                                    const original = Chart.defaults.plugins.legend.labels.generateLabels;
                                    const labels = original.call(this, chart);
                                    
                                    labels.forEach((label, index) => {
                                        const value = data[index].value;
                                        const percentage = ((value / data.reduce((sum, d) => sum + d.value, 0)) * 100).toFixed(1);
                                        label.text = `${label.text}: $${value.toLocaleString()} (${percentage}%)`;
                                    });
                                    
                                    return labels;
                                }
                            }
                        },
                        tooltip: {
                            backgroundColor: 'var(--color-professional-surface)',
                            titleColor: 'var(--color-professional-text)',
                            bodyColor: 'var(--color-professional-text)',
                            borderColor: 'var(--color-professional-primary)',
                            borderWidth: 1,
                            callbacks: {
                                label: function(context) {
                                    const total = context.dataset.data.reduce((sum, value) => sum + value, 0);
                                    const percentage = ((context.parsed / total) * 100).toFixed(1);
                                    return `${context.label}: $${context.parsed.toLocaleString()} (${percentage}%)`;
                                }
                            }
                        }
                    }
                }
            });
        }, 100);
    }

    async handleResetPortfolio() {
        const confirmed = confirm('Are you sure you want to reset your portfolio? This will clear all holdings and reset cash to $10,000.');
        
        if (!confirmed) return;

        try {
            await this.portfolioService.resetPortfolio();
            this.notificationService.success('Portfolio Reset', 'Your portfolio has been reset to initial state');
            this.loadPortfolioData();
        } catch (error) {
            console.error('❌ Error resetting portfolio:', error);
            this.notificationService.error('Reset Failed', 'Failed to reset portfolio');
        }
    }

    // Method to handle holding card actions
    handleHoldingAction(action, symbol, price) {
        switch (action) {
            case 'analyze':
                // Trigger stock modal opening
                document.dispatchEvent(new CustomEvent('openStockModal', { detail: symbol }));
                break;
            case 'buy-more':
                // Trigger buy modal
                document.dispatchEvent(new CustomEvent('openTradeModal', { 
                    detail: { type: 'buy', stock: { symbol, price } }
                }));
                break;
            case 'sell':
                // Trigger sell modal
                document.dispatchEvent(new CustomEvent('openTradeModal', { 
                    detail: { type: 'sell', stock: { symbol, price } }
                }));
                break;
        }
    }

    updatePortfolioChart() {
        if (!this.portfolioChart || !this.portfolio?.holdings) return;

        const data = this.portfolio.holdings.map(holding => ({
            symbol: holding.symbol,
            value: holding.shares * holding.currentPrice
        }));

        // Update chart data
        this.portfolioChart.data.datasets[0].data = data.map(d => d.value);
        this.portfolioChart.update('none');
    }

    // Public method to refresh data
    async refresh() {
        await this.loadPortfolioData();
    }

    // Get component statistics
    getStats() {
        return {
            portfolioLoaded: !!this.portfolio,
            holdingsCount: this.portfolio?.holdings?.length || 0,
            chartActive: !!this.portfolioChart,
            realTimeSubscribed: !!this.realTimeSubscription
        };
    }

    // Cleanup method
    destroy() {
        console.log('📊 Destroying Portfolio Dashboard...');
        
        if (this.portfolioChart) {
            this.portfolioChart.destroy();
        }
        if (this.performanceChart) {
            this.performanceChart.destroy();
        }
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
        if (this.realTimeSubscription) {
            this.realTimeSubscription();
        }
    }
}