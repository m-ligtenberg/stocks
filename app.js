// Enhanced Stock Tracker Application with Institutional Holdings and Stock Details
class EnhancedStockTracker {
    constructor() {
        // Stock data from provided JSON
        this.institutionalHoldings = {
            blackrock: [
                {symbol: "AAPL", name: "Apple Inc", percentage: 5.3, value: "$66.6B"},
                {symbol: "MSFT", name: "Microsoft Corp", percentage: 4.6, value: "$58.2B"},
                {symbol: "NVDA", name: "NVIDIA Corp", percentage: 4.3, value: "$54.4B"},
                {symbol: "AMZN", name: "Amazon.com Inc", percentage: 2.8, value: "$35.4B"},
                {symbol: "META", name: "Meta Platforms", percentage: 2.0, value: "$25.3B"}
            ],
            vanguard: [
                {symbol: "VOO", name: "Vanguard S&P 500 ETF", percentage: 22.1, value: "$571.45"},
                {symbol: "VTI", name: "Vanguard Total Stock Market", percentage: 18.3, value: "$289.20"},
                {symbol: "AAPL", name: "Apple Inc", percentage: 7.2, value: "$207.57"},
                {symbol: "MSFT", name: "Microsoft Corp", percentage: 6.8, value: "$435.75"},
                {symbol: "NVDA", name: "NVIDIA Corp", percentage: 5.1, value: "$107.63"}
            ],
            berkshire: [
                {symbol: "AAPL", name: "Apple Inc", percentage: 25.76, value: "$66.6B"},
                {symbol: "AXP", name: "American Express", percentage: 15.77, value: "$40.8B"},
                {symbol: "KO", name: "Coca-Cola Co", percentage: 11.07, value: "$28.6B"},
                {symbol: "BAC", name: "Bank of America", percentage: 10.19, value: "$26.4B"},
                {symbol: "CVX", name: "Chevron Corp", percentage: 7.67, value: "$19.8B"}
            ]
        };

        this.stocks = {
            under1: [
                {symbol: "HYSR", name: "SunHydrogen Inc", price: 0.42, basePrice: 0.42, change: 0.03, changePercent: 7.69, sector: "Clean Energy", description: "Renewable hydrogen technology company with breakthrough potential"},
                {symbol: "ACST", name: "Acasti Pharma", price: 0.68, basePrice: 0.68, change: -0.02, changePercent: -2.86, sector: "Biotechnology", description: "Biopharmaceutical company focused on rare diseases"},
                {symbol: "IMUX", name: "Immunic Inc", price: 0.95, basePrice: 0.95, change: 0.08, changePercent: 9.20, sector: "Pharmaceuticals", description: "Clinical-stage biopharmaceutical company"},
                {symbol: "URG", name: "Ur-Energy Inc", price: 0.89, basePrice: 0.89, change: 0.04, changePercent: 4.71, sector: "Mining", description: "Uranium mining company positioned for nuclear energy growth"},
                {symbol: "INUV", name: "Inuvo Inc", price: 0.76, basePrice: 0.76, change: -0.01, changePercent: -1.30, sector: "Technology", description: "AI-driven marketing technology platform"}
            ],
            under4: [
                {symbol: "TTI", name: "TETRA Technologies", price: 3.24, basePrice: 3.24, priceRange: "$2.50 - $3.54", change: 0.12, changePercent: 3.85, sector: "Oil Services", description: "Oil services company benefiting from energy sector recovery"},
                {symbol: "SB", name: "Safe Bulkers", price: 3.53, basePrice: 3.53, priceRange: "$3.30 - $3.77", change: -0.08, changePercent: -2.22, sector: "Shipping", description: "Dry bulk shipping positioned for global trade recovery"},
                {symbol: "TUYA", name: "Tuya Inc", price: 2.37, basePrice: 2.37, priceRange: "$1.95 - $2.79", change: 0.15, changePercent: 6.76, sector: "IoT Technology", description: "Smart home IoT platform with growth potential"},
                {symbol: "NOK", name: "Nokia Corporation", price: 3.92, basePrice: 3.92, priceRange: "~$4.97 (dips under $4)", change: -0.23, changePercent: -5.54, sector: "Telecom Equipment", description: "5G infrastructure buildout beneficiary"},
                {symbol: "FSI", name: "Flexible Solutions International", price: 4.16, basePrice: 4.16, priceRange: "$3.78 - $4.55", change: 0.08, changePercent: 1.96, sector: "Specialty Chemicals", description: "Niche specialty chemicals with agricultural applications"}
            ],
            highPotential: [
                {symbol: "DSGN", name: "Design Therapeutics", price: 4.52, basePrice: 4.52, priceRange: "$4.20 - $4.85", change: 0.27, changePercent: 6.35, sector: "Biotechnology", description: "Gene therapy platform with multiple pipeline programs", potential: "High growth biotech with breakthrough gene therapy"},
                {symbol: "SRNE", name: "Sorrento Therapeutics", price: 3.81, basePrice: 3.81, priceRange: "$2.95 - $4.65", change: 0.19, changePercent: 5.25, sector: "Biopharmaceuticals", description: "Diverse pipeline in oncology and pain management", potential: "Multiple FDA approvals expected in 2025"}
            ]
        };

        this.settings = {
            notificationTime: '08:00',
            notificationsEnabled: false,
            stocksEnabled: {}
        };

        // Initialize stock settings
        this.initializeStockSettings();

        this.notificationHistory = [];
        this.priceUpdateInterval = null;
        this.lastNotificationDate = null;
        this.currentChart = null;
        this.originalStockCards = [];
        
        this.init();
    }

    initializeStockSettings() {
        const allStocks = [...this.stocks.under1, ...this.stocks.under4, ...this.stocks.highPotential];
        allStocks.forEach(stock => {
            this.settings.stocksEnabled[stock.symbol] = true;
        });
    }

    init() {
        console.log('Initializing Enhanced Stock Tracker...');
        this.setupEventListeners();
        this.renderInstitutionalHoldings();
        this.renderStocks();
        this.updateAmsterdamTime();
        this.checkNotificationPermission();
        this.startPriceUpdates();
        
        // Update time every second
        setInterval(() => this.updateAmsterdamTime(), 1000);
        
        console.log('Enhanced Stock Tracker initialized successfully');
    }

    setupEventListeners() {
        // Notification banner
        const enableBtn = document.getElementById('enable-notifications');
        const dismissBtn = document.getElementById('dismiss-banner');
        
        if (enableBtn) {
            enableBtn.addEventListener('click', () => {
                this.requestNotificationPermission();
            });
        }

        if (dismissBtn) {
            dismissBtn.addEventListener('click', () => {
                document.getElementById('notification-banner').classList.add('hidden');
            });
        }

        // Settings
        document.getElementById('test-notification').addEventListener('click', () => {
            this.sendTestNotification();
        });

        document.getElementById('save-settings').addEventListener('click', () => {
            this.settings.notificationTime = document.getElementById('notification-time').value;
            this.showMessage('Settings saved successfully!', 'success');
        });

        document.getElementById('clear-history').addEventListener('click', () => {
            this.clearNotificationHistory();
        });

        // Search functionality - fixed
        const searchInput = document.getElementById('stock-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.filterStocks(e.target.value);
            });
        }

        // Modal event listeners
        const modal = document.getElementById('stock-modal');
        const closeModal = document.getElementById('close-modal');
        const modalOverlay = document.querySelector('.modal-overlay');

        if (closeModal) {
            closeModal.addEventListener('click', () => this.closeStockModal());
        }
        
        if (modalOverlay) {
            modalOverlay.addEventListener('click', () => this.closeStockModal());
        }

        // Fixed delegated event handling for stock cards and toggles
        document.addEventListener('click', (e) => {
            // Handle toggle clicks first (to prevent modal opening)
            if (e.target.classList.contains('toggle-switch')) {
                e.stopPropagation();
                const symbol = e.target.dataset.symbol;
                this.toggleStock(symbol, e.target);
                return;
            }
            
            // Handle stock card clicks
            const stockCard = e.target.closest('.stock-card');
            if (stockCard && !e.target.closest('.stock-toggle')) {
                e.preventDefault();
                const symbol = stockCard.dataset.symbol || stockCard.querySelector('.stock-symbol').textContent;
                console.log('Opening modal for stock:', symbol);
                this.openStockModal(symbol);
                return;
            }
            
            // Handle holding item clicks
            const holdingItem = e.target.closest('.holding-item');
            if (holdingItem) {
                e.preventDefault();
                const symbol = holdingItem.dataset.symbol || holdingItem.querySelector('.holding-symbol').textContent;
                console.log('Opening modal for holding:', symbol);
                this.openStockModal(symbol);
                return;
            }
        });

        // Keyboard events
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeStockModal();
            }
        });
    }

    renderInstitutionalHoldings() {
        // Render BlackRock holdings
        const blackrockContainer = document.getElementById('blackrock-holdings');
        if (blackrockContainer) {
            blackrockContainer.innerHTML = this.institutionalHoldings.blackrock.map(holding => `
                <div class="holding-item" data-symbol="${holding.symbol}">
                    <div class="holding-info">
                        <div class="holding-symbol">${holding.symbol}</div>
                        <div class="holding-name">${holding.name}</div>
                    </div>
                    <div class="holding-details">
                        <div class="holding-percentage">${holding.percentage}%</div>
                        <div class="holding-value">${holding.value}</div>
                    </div>
                </div>
            `).join('');
        }

        // Render Vanguard holdings
        const vanguardContainer = document.getElementById('vanguard-holdings');
        if (vanguardContainer) {
            vanguardContainer.innerHTML = this.institutionalHoldings.vanguard.map(holding => `
                <div class="holding-item" data-symbol="${holding.symbol}">
                    <div class="holding-info">
                        <div class="holding-symbol">${holding.symbol}</div>
                        <div class="holding-name">${holding.name}</div>
                    </div>
                    <div class="holding-details">
                        <div class="holding-percentage">${holding.percentage}%</div>
                        <div class="holding-value">${holding.value}</div>
                    </div>
                </div>
            `).join('');
        }

        // Render Berkshire holdings
        const berkshireContainer = document.getElementById('berkshire-holdings');
        if (berkshireContainer) {
            berkshireContainer.innerHTML = this.institutionalHoldings.berkshire.map(holding => `
                <div class="holding-item" data-symbol="${holding.symbol}">
                    <div class="holding-info">
                        <div class="holding-symbol">${holding.symbol}</div>
                        <div class="holding-name">${holding.name}</div>
                    </div>
                    <div class="holding-details">
                        <div class="holding-percentage">${holding.percentage}%</div>
                        <div class="holding-value">${holding.value}</div>
                    </div>
                </div>
            `).join('');
        }
    }

    renderStocks() {
        this.renderStockGrid('stocks-under-1', this.stocks.under1, 'penny');
        this.renderStockGrid('stocks-under-4', this.stocks.under4, false);
        this.renderStockGrid('high-potential-stocks', this.stocks.highPotential, 'high-potential');
        
        // Store original cards for filtering
        this.storeOriginalCards();
    }

    storeOriginalCards() {
        this.originalStockCards = [];
        document.querySelectorAll('.stock-card').forEach(card => {
            this.originalStockCards.push({
                element: card.cloneNode(true),
                parent: card.parentNode,
                symbol: card.dataset.symbol || card.querySelector('.stock-symbol').textContent,
                name: card.querySelector('.stock-name').textContent,
                sector: card.querySelector('.stock-sector').textContent
            });
        });
    }

    renderStockGrid(containerId, stocks, cardType) {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error('Container not found:', containerId);
            return;
        }
        container.innerHTML = stocks.map(stock => this.createStockCard(stock, cardType)).join('');
    }

    createStockCard(stock, cardType) {
        const isEnabled = this.settings.stocksEnabled[stock.symbol];
        const changeClass = stock.change >= 0 ? 'positive' : 'negative';
        const changeSign = stock.change >= 0 ? '+' : '';
        
        let cardClass = 'stock-card';
        if (cardType === 'high-potential') cardClass += ' stock-card--high-potential';
        if (cardType === 'penny') cardClass += ' stock-card--penny';
        
        return `
            <div class="${cardClass}" data-symbol="${stock.symbol}">
                <div class="stock-header">
                    <div class="stock-info">
                        <h3 class="stock-symbol">${stock.symbol}</h3>
                        <p class="stock-name">${stock.name}</p>
                    </div>
                    <div class="stock-toggle">
                        <span style="font-size: var(--font-size-xs); color: var(--color-text-secondary);">Alerts</span>
                        <div class="toggle-switch ${isEnabled ? 'active' : ''}" data-symbol="${stock.symbol}"></div>
                    </div>
                </div>
                
                <div class="stock-price">
                    <span class="price-current">$${stock.price.toFixed(2)}</span>
                    <span class="price-change ${changeClass}">
                        ${changeSign}$${Math.abs(stock.change).toFixed(2)} (${changeSign}${stock.changePercent.toFixed(2)}%)
                    </span>
                </div>
                
                <div class="stock-details">
                    ${stock.priceRange ? `<div class="price-range">Range: ${stock.priceRange}</div>` : ''}
                    <span class="stock-sector">${stock.sector}</span>
                    <p class="stock-description">${stock.description}</p>
                    ${stock.potential ? `<div class="stock-potential">${stock.potential}</div>` : ''}
                </div>
            </div>
        `;
    }

    filterStocks(searchTerm) {
        const term = searchTerm.toLowerCase().trim();
        
        // Show all cards if search is empty
        if (!term) {
            document.querySelectorAll('.stock-card, .holding-item').forEach(item => {
                item.style.display = '';
            });
            return;
        }

        // Filter stock cards
        document.querySelectorAll('.stock-card').forEach(card => {
            const symbol = (card.dataset.symbol || card.querySelector('.stock-symbol').textContent).toLowerCase();
            const name = card.querySelector('.stock-name').textContent.toLowerCase();
            const sector = card.querySelector('.stock-sector').textContent.toLowerCase();
            
            const matches = symbol.includes(term) || name.includes(term) || sector.includes(term);
            card.style.display = matches ? '' : 'none';
        });

        // Filter institutional holdings
        document.querySelectorAll('.holding-item').forEach(item => {
            const symbol = (item.dataset.symbol || item.querySelector('.holding-symbol').textContent).toLowerCase();
            const name = item.querySelector('.holding-name').textContent.toLowerCase();
            
            const matches = symbol.includes(term) || name.includes(term);
            item.style.display = matches ? '' : 'none';
        });
    }

    openStockModal(symbol) {
        const stock = this.findStockBySymbol(symbol);
        if (!stock) {
            console.error('Stock not found:', symbol);
            return;
        }

        const modal = document.getElementById('stock-modal');
        if (!modal) {
            console.error('Modal not found');
            return;
        }

        document.getElementById('modal-stock-name').textContent = `${stock.name} (${stock.symbol})`;
        
        this.populateCompanyInfo(stock);
        this.populateFinancialMetrics(stock);
        this.populateRiskAssessment(stock);
        this.populateNewsAnalysis(stock);
        this.createPriceChart(stock);
        
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
        
        console.log('Modal opened for:', symbol);
    }

    closeStockModal() {
        const modal = document.getElementById('stock-modal');
        if (modal) {
            modal.classList.add('hidden');
        }
        document.body.style.overflow = '';
        
        // Destroy chart if it exists
        if (this.currentChart) {
            this.currentChart.destroy();
            this.currentChart = null;
        }
    }

    findStockBySymbol(symbol) {
        const allStocks = [...this.stocks.under1, ...this.stocks.under4, ...this.stocks.highPotential];
        let stock = allStocks.find(s => s.symbol === symbol);
        
        // If not found in our stocks, create a basic stock object from institutional holdings
        if (!stock) {
            const allHoldings = [...this.institutionalHoldings.blackrock, ...this.institutionalHoldings.vanguard, ...this.institutionalHoldings.berkshire];
            const holding = allHoldings.find(h => h.symbol === symbol);
            if (holding) {
                stock = {
                    symbol: holding.symbol,
                    name: holding.name,
                    price: Math.random() * 200 + 50, // Mock price for major stocks
                    basePrice: Math.random() * 200 + 50,
                    change: (Math.random() - 0.5) * 10,
                    changePercent: (Math.random() - 0.5) * 5,
                    sector: this.getSectorForSymbol(symbol),
                    description: `${holding.name} is a major corporation held by institutional investors.`
                };
            }
        }
        
        return stock;
    }

    getSectorForSymbol(symbol) {
        const sectorMap = {
            'AAPL': 'Technology',
            'MSFT': 'Technology',
            'NVDA': 'Technology',
            'AMZN': 'Consumer Discretionary',
            'META': 'Technology',
            'AXP': 'Financial Services',
            'KO': 'Consumer Staples',
            'BAC': 'Financial Services',
            'CVX': 'Energy',
            'VOO': 'ETF',
            'VTI': 'ETF'
        };
        return sectorMap[symbol] || 'Unknown';
    }

    populateCompanyInfo(stock) {
        const companyInfo = document.getElementById('company-info');
        if (companyInfo) {
            companyInfo.innerHTML = `
                <div class="info-item">
                    <span class="info-label">Symbol</span>
                    <span class="info-value">${stock.symbol}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Current Price</span>
                    <span class="info-value">$${stock.price.toFixed(2)}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Sector</span>
                    <span class="info-value">${stock.sector}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Market Cap</span>
                    <span class="info-value">${this.generateMarketCap(stock.price)}</span>
                </div>
                <div style="margin-top: var(--space-12); padding: var(--space-12); background: var(--color-bg-1); border-radius: var(--radius-sm);">
                    <p style="margin: 0; font-size: var(--font-size-sm); color: var(--color-text-secondary);">${stock.description}</p>
                </div>
            `;
        }
    }

    populateFinancialMetrics(stock) {
        const metrics = document.getElementById('financial-metrics');
        if (metrics) {
            metrics.innerHTML = `
                <div class="metric-item">
                    <div class="metric-value">${(stock.price * 0.85).toFixed(2)}</div>
                    <div class="metric-label">P/E Ratio</div>
                </div>
                <div class="metric-item">
                    <div class="metric-value">${(Math.random() * 5 + 1).toFixed(1)}</div>
                    <div class="metric-label">P/B Ratio</div>
                </div>
                <div class="metric-item">
                    <div class="metric-value">${(Math.random() * 3 + 0.5).toFixed(2)}%</div>
                    <div class="metric-label">Dividend Yield</div>
                </div>
                <div class="metric-item">
                    <div class="metric-value">${(Math.random() * 200 + 50).toFixed(0)}M</div>
                    <div class="metric-label">Volume</div>
                </div>
            `;
        }
    }

    populateRiskAssessment(stock) {
        const riskLevel = stock.price < 1 ? 'high' : stock.price < 5 ? 'medium' : 'low';
        const riskPercentage = stock.price < 1 ? 80 : stock.price < 5 ? 50 : 25;
        
        const riskAssessment = document.getElementById('risk-assessment');
        if (riskAssessment) {
            riskAssessment.innerHTML = `
                <div class="risk-meter">
                    <span class="risk-label">Volatility</span>
                    <div class="risk-bar">
                        <div class="risk-fill ${riskLevel}" style="width: ${riskPercentage}%"></div>
                    </div>
                    <span style="font-size: var(--font-size-sm); color: var(--color-text-secondary);">${riskLevel.toUpperCase()}</span>
                </div>
                <div style="margin-top: var(--space-12); padding: var(--space-12); background: var(--color-bg-1); border-radius: var(--radius-sm);">
                    <p style="margin: 0; font-size: var(--font-size-sm); color: var(--color-text-secondary);">
                        ${this.getRiskDescription(riskLevel, stock)}
                    </p>
                </div>
            `;
        }
    }

    getRiskDescription(riskLevel, stock) {
        switch(riskLevel) {
            case 'high':
                return `${stock.symbol} is a high-risk investment due to its low price point and high volatility. Suitable for speculative investors only.`;
            case 'medium':
                return `${stock.symbol} presents moderate risk with potential for both significant gains and losses. Diversification recommended.`;
            case 'low':
                return `${stock.symbol} is considered lower risk but still subject to market volatility. Suitable for more conservative portfolios.`;
            default:
                return 'Risk assessment unavailable.';
        }
    }

    populateNewsAnalysis(stock) {
        const newsAnalysis = document.getElementById('news-analysis');
        if (newsAnalysis) {
            newsAnalysis.innerHTML = `
                <div class="news-item">
                    <div class="news-title">${stock.symbol} Shows Strong Performance in ${stock.sector} Sector</div>
                    <div class="news-summary">Recent analysis suggests ${stock.name} is well-positioned for growth with solid fundamentals and market presence.</div>
                    <div class="news-meta">
                        <span>MarketWatch</span>
                        <span>2 hours ago</span>
                    </div>
                </div>
                <div class="news-item">
                    <div class="news-title">Analyst Upgrade: ${stock.name} Receives Buy Rating</div>
                    <div class="news-summary">Investment firm upgrades ${stock.symbol} citing strong quarterly results and positive outlook for the sector.</div>
                    <div class="news-meta">
                        <span>Financial Times</span>
                        <span>1 day ago</span>
                    </div>
                </div>
                <div class="news-item">
                    <div class="news-title">${stock.sector} Sector Outlook Remains Positive</div>
                    <div class="news-summary">Industry experts maintain optimistic view on ${stock.sector} companies including ${stock.name}.</div>
                    <div class="news-meta">
                        <span>Reuters</span>
                        <span>3 days ago</span>
                    </div>
                </div>
            `;
        }
    }

    createPriceChart(stock) {
        const canvas = document.getElementById('price-chart');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        
        // Generate mock historical data
        const data = this.generateMockPriceData(stock.basePrice || stock.price, 30);
        
        if (this.currentChart) {
            this.currentChart.destroy();
        }
        
        this.currentChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.labels,
                datasets: [{
                    label: `${stock.symbol} Price`,
                    data: data.prices,
                    borderColor: '#FFD700',
                    backgroundColor: 'rgba(255, 215, 0, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: {
                            color: '#ffffff'
                        }
                    }
                },
                scales: {
                    x: {
                        ticks: {
                            color: '#cccccc'
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        }
                    },
                    y: {
                        ticks: {
                            color: '#cccccc',
                            callback: function(value) {
                                return '$' + value.toFixed(2);
                            }
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        }
                    }
                }
            }
        });
    }

    generateMockPriceData(basePrice, days) {
        const labels = [];
        const prices = [];
        let currentPrice = basePrice;
        
        for (let i = days; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            labels.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
            
            // Add some realistic price variation
            const change = (Math.random() - 0.5) * 0.1 * basePrice;
            currentPrice = Math.max(0.01, currentPrice + change);
            prices.push(parseFloat(currentPrice.toFixed(2)));
        }
        
        return { labels, prices };
    }

    generateMarketCap(price) {
        const multiplier = Math.random() * 1000 + 100;
        const marketCap = price * multiplier;
        
        if (marketCap > 1000) {
            return `$${(marketCap / 1000).toFixed(1)}B`;
        } else {
            return `$${marketCap.toFixed(0)}M`;
        }
    }

    updateAmsterdamTime() {
        try {
            const now = new Date();
            const amsterdamTime = new Date(now.toLocaleString("en-US", {timeZone: "Europe/Amsterdam"}));
            
            const timeString = amsterdamTime.toLocaleTimeString('en-GB', {
                hour12: false,
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
            
            const dateString = amsterdamTime.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                timeZone: "Europe/Amsterdam"
            });

            const timeElement = document.getElementById('amsterdam-time');
            const dateElement = document.getElementById('amsterdam-date');
            
            if (timeElement) timeElement.textContent = timeString;
            if (dateElement) dateElement.textContent = dateString;

            this.checkMorningNotification(amsterdamTime);
        } catch (error) {
            console.error('Error updating Amsterdam time:', error);
            const now = new Date();
            const timeElement = document.getElementById('amsterdam-time');
            const dateElement = document.getElementById('amsterdam-date');
            
            if (timeElement) timeElement.textContent = now.toLocaleTimeString('en-GB', { hour12: false });
            if (dateElement) dateElement.textContent = now.toLocaleDateString('en-US');
        }
    }

    checkMorningNotification(amsterdamTime) {
        if (!this.settings.notificationsEnabled || Notification.permission !== 'granted') {
            return;
        }

        const currentTime = amsterdamTime.toTimeString().slice(0, 5);
        const currentDate = amsterdamTime.toDateString();
        
        if (currentTime === this.settings.notificationTime && 
            this.lastNotificationDate !== currentDate) {
            
            this.sendMorningNotifications();
            this.lastNotificationDate = currentDate;
        }
    }

    async checkNotificationPermission() {
        if (!('Notification' in window)) {
            console.log('This browser does not support notifications');
            this.updateNotificationStatus();
            return;
        }

        const permission = Notification.permission;
        console.log('Notification permission:', permission);
        
        if (permission === 'granted') {
            this.settings.notificationsEnabled = true;
            this.updateNotificationStatus();
            const banner = document.getElementById('notification-banner');
            if (banner) banner.classList.add('hidden');
        } else if (permission === 'denied') {
            this.settings.notificationsEnabled = false;
            this.updateNotificationStatus();
            const banner = document.getElementById('notification-banner');
            if (banner) banner.classList.remove('hidden');
        } else {
            const banner = document.getElementById('notification-banner');
            if (banner) banner.classList.remove('hidden');
        }
    }

    async requestNotificationPermission() {
        if (!('Notification' in window)) {
            this.showMessage('This browser does not support notifications', 'error');
            return false;
        }

        try {
            const permission = await Notification.requestPermission();
            console.log('Notification permission result:', permission);
            
            if (permission === 'granted') {
                this.settings.notificationsEnabled = true;
                this.updateNotificationStatus();
                const banner = document.getElementById('notification-banner');
                if (banner) banner.classList.add('hidden');
                this.showMessage('Notifications enabled successfully!', 'success');
                return true;
            } else {
                this.settings.notificationsEnabled = false;
                this.updateNotificationStatus();
                this.showMessage('Notifications permission denied', 'error');
                return false;
            }
        } catch (error) {
            console.error('Error requesting notification permission:', error);
            this.showMessage('Error enabling notifications', 'error');
            return false;
        }
    }

    updateNotificationStatus() {
        const statusElement = document.getElementById('notification-status-text');
        if (statusElement) {
            if (this.settings.notificationsEnabled && Notification.permission === 'granted') {
                statusElement.textContent = 'Enabled';
                statusElement.className = 'status status--success';
            } else {
                statusElement.textContent = 'Not Enabled';
                statusElement.className = 'status status--error';
            }
        }
    }

    sendTestNotification() {
        if (!('Notification' in window)) {
            this.showMessage('Notifications not supported', 'error');
            return;
        }

        if (Notification.permission !== 'granted') {
            this.showMessage('Please enable notifications first', 'warning');
            return;
        }

        const enabledStocks = this.getEnabledStocks();
        if (enabledStocks.length === 0) {
            this.showMessage('No stocks enabled for notifications', 'info');
            return;
        }

        const randomStock = enabledStocks[Math.floor(Math.random() * enabledStocks.length)];
        
        try {
            const notification = new Notification('Enhanced Stock Tracker - Test Alert', {
                body: `${randomStock.symbol}: $${randomStock.price.toFixed(2)} (${randomStock.changePercent > 0 ? '+' : ''}${randomStock.changePercent.toFixed(2)}%)`,
                icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23FFD700"><path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/></svg>',
                tag: 'stock-test',
                requireInteraction: false
            });

            this.addToHistory('Test Notification', `Test alert for ${randomStock.symbol}: $${randomStock.price.toFixed(2)}`, 'test');
            this.showMessage('Test notification sent!', 'success');

            notification.onclick = () => {
                window.focus();
                notification.close();
            };

            setTimeout(() => {
                notification.close();
            }, 5000);

        } catch (error) {
            console.error('Error sending test notification:', error);
            this.showMessage('Error sending notification', 'error');
        }
    }

    sendMorningNotifications() {
        if (Notification.permission !== 'granted') return;

        const enabledStocks = this.getEnabledStocks();
        const alertStocks = enabledStocks.filter(stock => 
            stock.price <= 1 || stock.price <= 4 || (stock.price <= 5 && stock.potential)
        );

        if (alertStocks.length === 0) return;

        try {
            const notification = new Notification('Enhanced Stock Tracker - Morning Alert', {
                body: `${alertStocks.length} stocks under watchlist thresholds. Click to view details.`,
                icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23FFD700"><path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/></svg>',
                tag: 'morning-alert',
                requireInteraction: true
            });

            notification.onclick = () => {
                window.focus();
                notification.close();
            };

            this.addToHistory(
                'Morning Alert', 
                `Watchlist summary: ${alertStocks.length} stocks under thresholds`, 
                'morning'
            );

            console.log('Morning notification sent for', alertStocks.length, 'stocks');
        } catch (error) {
            console.error('Error sending morning notification:', error);
        }
    }

    getEnabledStocks() {
        const allStocks = [...this.stocks.under1, ...this.stocks.under4, ...this.stocks.highPotential];
        return allStocks.filter(stock => this.settings.stocksEnabled[stock.symbol]);
    }

    addToHistory(title, message, type) {
        try {
            const amsterdamTime = new Date().toLocaleString("en-US", {timeZone: "Europe/Amsterdam"});
            const currentDate = new Date().toDateString();
            
            this.notificationHistory.unshift({
                title,
                message,
                type,
                timestamp: amsterdamTime,
                date: currentDate
            });

            if (this.notificationHistory.length > 50) {
                this.notificationHistory = this.notificationHistory.slice(0, 50);
            }

            this.updateNotificationHistory();
        } catch (error) {
            console.error('Error adding to notification history:', error);
        }
    }

    updateNotificationHistory() {
        const logElement = document.getElementById('notification-log');
        if (!logElement) return;
        
        if (this.notificationHistory.length === 0) {
            logElement.innerHTML = '<p class="empty-state">No notifications sent yet</p>';
            return;
        }

        logElement.innerHTML = this.notificationHistory.map(notification => `
            <div class="notification-item">
                <div class="notification-content">
                    <h4 class="notification-title">${notification.title}</h4>
                    <p class="notification-message">${notification.message}</p>
                </div>
                <span class="notification-time">${notification.timestamp}</span>
            </div>
        `).join('');
    }

    clearNotificationHistory() {
        this.notificationHistory = [];
        this.updateNotificationHistory();
        this.showMessage('Notification history cleared', 'info');
    }

    toggleStock(symbol, toggleElement) {
        this.settings.stocksEnabled[symbol] = !this.settings.stocksEnabled[symbol];
        toggleElement.classList.toggle('active');
        
        const status = this.settings.stocksEnabled[symbol] ? 'enabled' : 'disabled';
        this.showMessage(`${symbol} notifications ${status}`, 'info');
        console.log(`${symbol} notifications ${status}`);
    }

    startPriceUpdates() {
        this.priceUpdateInterval = setInterval(() => {
            this.updatePrices();
        }, 15000);
        
        console.log('Price updates started');
    }

    updatePrices() {
        const allStocks = [...this.stocks.under1, ...this.stocks.under4, ...this.stocks.highPotential];
        
        allStocks.forEach(stock => {
            const changePercent = (Math.random() - 0.5) * 6;
            const priceChange = stock.basePrice * (changePercent / 100);
            
            const minPrice = stock.basePrice * 0.8;
            const maxPrice = stock.basePrice * 1.2;
            
            stock.price = Math.max(minPrice, Math.min(maxPrice, stock.basePrice + priceChange));
            stock.change = stock.price - stock.basePrice;
            stock.changePercent = ((stock.price - stock.basePrice) / stock.basePrice) * 100;
        });

        this.renderStocks();
        console.log('Prices updated');
    }

    showMessage(message, type) {
        const messageEl = document.createElement('div');
        messageEl.className = `status status--${type} success-message`;
        messageEl.textContent = message;

        document.body.appendChild(messageEl);

        setTimeout(() => {
            messageEl.classList.add('show');
        }, 100);

        setTimeout(() => {
            messageEl.classList.remove('show');
            setTimeout(() => {
                if (messageEl.parentNode) {
                    messageEl.remove();
                }
            }, 300);
        }, 3000);
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing Enhanced Stock Tracker...');
    try {
        window.enhancedStockTracker = new EnhancedStockTracker();
    } catch (error) {
        console.error('Error initializing Enhanced Stock Tracker:', error);
    }
});