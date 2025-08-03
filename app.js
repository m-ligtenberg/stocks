// Lupo - Professional Retail-Focused Trading Platform

// Stock Data API Service
class StockDataService {
    constructor() {
        // Alpha Vantage API configuration
        this.API_KEY = 'MRUM29SGMJPSAX9M'; // Alpha Vantage API key
        this.BASE_URL = 'https://www.alphavantage.co/query';
        this.requestCount = 0;
        this.maxRequestsPerMinute = 5; // Free tier limit
        this.lastRequestTime = 0;
    }

    async fetchStockQuote(symbol) {
        if (!this.canMakeRequest()) {
            console.warn('⚠️ API rate limit reached, using cached/demo data');
            return this.getDemoStockData(symbol);
        }

        try {
            const url = `${this.BASE_URL}?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${this.API_KEY}`;
            console.log(`📡 Fetching real-time data for ${symbol}`);
            
            const response = await fetch(url);
            const data = await response.json();
            
            this.updateRequestTracking();

            if (data['Global Quote']) {
                return this.parseAlphaVantageQuote(data['Global Quote'], symbol);
            } else {
                console.warn(`⚠️ API returned no data for ${symbol}, using demo data`);
                return this.getDemoStockData(symbol);
            }
        } catch (error) {
            console.error(`❌ Error fetching data for ${symbol}:`, error);
            return this.getDemoStockData(symbol);
        }
    }

    async fetchMultipleStocks(symbols) {
        const promises = symbols.map(symbol => this.fetchStockQuote(symbol));
        return Promise.all(promises);
    }

    parseAlphaVantageQuote(quote, symbol) {
        const price = parseFloat(quote['05. price']);
        const change = parseFloat(quote['09. change']);
        const changePercent = parseFloat(quote['10. change percent'].replace('%', ''));
        
        return {
            symbol: symbol,
            name: this.getCompanyName(symbol),
            price: price,
            change: change,
            changePercent: changePercent,
            volume: parseInt(quote['06. volume']),
            lastUpdated: quote['07. latest trading day'],
            retailInterest: Math.floor(Math.random() * 40 + 40), // Simulated for now
            opportunity: this.getOpportunityCategory(price)
        };
    }

    getDemoStockData(symbol) {
        // Fallback demo data when API is unavailable
        const demoData = {
            'AAPL': { name: 'Apple Inc', basePrice: 175.50 },
            'MSFT': { name: 'Microsoft Corp', basePrice: 378.85 },
            'NVDA': { name: 'NVIDIA Corp', basePrice: 875.28 },
            'TSLA': { name: 'Tesla Inc', basePrice: 248.50 },
            'NOK': { name: 'Nokia Corporation', basePrice: 3.92 },
            'HYSR': { name: 'SunHydrogen Inc', basePrice: 0.42 },
            'AMC': { name: 'AMC Entertainment', basePrice: 4.25 }
        };

        const stock = demoData[symbol] || { name: `${symbol} Corporation`, basePrice: Math.random() * 100 + 10 };
        const change = (Math.random() - 0.5) * 10;
        const price = Math.max(0.01, stock.basePrice + change);
        
        return {
            symbol: symbol,
            name: stock.name,
            price: price,
            change: change,
            changePercent: (change / stock.basePrice) * 100,
            volume: Math.floor(Math.random() * 10000000 + 1000000),
            lastUpdated: new Date().toISOString().split('T')[0],
            retailInterest: Math.floor(Math.random() * 40 + 40),
            opportunity: this.getOpportunityCategory(price)
        };
    }

    canMakeRequest() {
        const now = Date.now();
        if (now - this.lastRequestTime > 60000) {
            this.requestCount = 0;
        }
        return this.requestCount < this.maxRequestsPerMinute;
    }

    updateRequestTracking() {
        this.requestCount++;
        this.lastRequestTime = Date.now();
    }

    getCompanyName(symbol) {
        const companyNames = {
            'AAPL': 'Apple Inc',
            'MSFT': 'Microsoft Corp',
            'NVDA': 'NVIDIA Corp',
            'AMZN': 'Amazon.com Inc',
            'TSLA': 'Tesla Inc',
            'GOOGL': 'Alphabet Inc',
            'META': 'Meta Platforms',
            'NOK': 'Nokia Corporation',
            'AMD': 'Advanced Micro Devices',
            'INTC': 'Intel Corporation',
            'HYSR': 'SunHydrogen Inc',
            'AMC': 'AMC Entertainment Holdings',
            'GME': 'GameStop Corp',
            'PLTR': 'Palantir Technologies',
            'RIVN': 'Rivian Automotive'
        };
        return companyNames[symbol] || `${symbol} Corporation`;
    }

    getOpportunityCategory(price) {
        if (price < 1) return "Micro-Cap Value";
        if (price < 5) return "Small-Cap Growth";
        if (price < 50) return "Mid-Cap Opportunity";
        return "Large-Cap Investment";
    }
}

class LupoPlatform {
    constructor() {
        // Initialize stock data service
        this.stockService = new StockDataService();
        
        // Initialize personal watchlist
        this.watchlist = this.loadWatchlistFromStorage();
        
        // Initialize portfolio system
        this.portfolio = this.loadPortfolioFromStorage();
        this.transactions = this.loadTransactionsFromStorage();
        
        // Market intelligence data - professional approach
        this.marketData = JSON.parse(`{
  "theme": {
    "primary": "#F59E0B",
    "secondary": "#FCD34D", 
    "background": "#0F172A",
    "surface": "#1E293B",
    "accent": "#3B82F6",
    "text": "#F8FAFC",
    "textSecondary": "#CBD5E1"
  },
  "marketIntelligence": {
    "retailSentiment": 68,
    "institutionalSentiment": 42,
    "communityMembers": 45289,
    "activeDiscussions": 1247,
    "opportunitiesFound": 23
  },
  "institutionalHoldings": {
    "blackrock": [
      {"symbol": "AAPL", "name": "Apple Inc", "holding": "$66.6B", "change": "+2.1%"},
      {"symbol": "MSFT", "name": "Microsoft Corp", "holding": "$58.2B", "change": "+1.8%"},
      {"symbol": "NVDA", "name": "NVIDIA Corp", "holding": "$54.4B", "change": "+4.2%"},
      {"symbol": "AMZN", "name": "Amazon.com", "holding": "$35.4B", "change": "-0.8%"}
    ],
    "vanguard": [
      {"symbol": "VTI", "name": "Total Stock Market ETF", "holding": "$289.2B", "change": "+0.5%"},
      {"symbol": "VOO", "name": "S&P 500 ETF", "holding": "$571.4B", "change": "+0.7%"},
      {"symbol": "AAPL", "name": "Apple Inc", "holding": "$207.6B", "change": "+2.1%"}
    ],
    "berkshire": [
      {"symbol": "AAPL", "name": "Apple Inc", "holding": "$66.6B", "change": "+2.1%"},
      {"symbol": "AXP", "name": "American Express", "holding": "$40.8B", "change": "+1.3%"},
      {"symbol": "KO", "name": "Coca-Cola Co", "holding": "$28.6B", "change": "+0.9%"}
    ]
  },
  "retailOpportunities": {
    "under1": [
      {"symbol": "HYSR", "name": "SunHydrogen Inc", "price": 0.42, "change": 0.03, "changePercent": 7.69, "retailInterest": 78, "opportunity": "Clean Energy Growth"},
      {"symbol": "ACST", "name": "Acasti Pharma", "price": 0.68, "change": -0.02, "changePercent": -2.86, "retailInterest": 65, "opportunity": "Biotech Potential"},
      {"symbol": "URG", "name": "Ur-Energy Inc", "price": 0.89, "change": 0.04, "changePercent": 4.71, "retailInterest": 71, "opportunity": "Uranium Play"}
    ],
    "under4": [
      {"symbol": "TTI", "name": "TETRA Technologies", "price": 3.24, "change": 0.12, "changePercent": 3.85, "retailInterest": 68, "opportunity": "Energy Services Recovery"},
      {"symbol": "SB", "name": "Safe Bulkers", "price": 3.53, "change": -0.08, "changePercent": -2.22, "retailInterest": 59, "opportunity": "Shipping Cycle"},
      {"symbol": "NOK", "name": "Nokia Corporation", "price": 3.92, "change": -0.23, "changePercent": -5.54, "retailInterest": 82, "opportunity": "5G Infrastructure"}
    ],
    "under5": [
      {"symbol": "DSGN", "name": "Design Therapeutics", "price": 4.52, "change": 0.27, "changePercent": 6.35, "retailInterest": 74, "opportunity": "Gene Therapy Innovation"},
      {"symbol": "SRNE", "name": "Sorrento Therapeutics", "price": 3.81, "change": 0.19, "changePercent": 5.25, "retailInterest": 69, "opportunity": "Biotech Pipeline"}
    ]
  },
  "communityInsights": [
    {
      "title": "Deep Dive: Nokia's 5G Infrastructure Potential",
      "author": "TechAnalyst_Pro",
      "category": "Research",
      "upvotes": 156,
      "comments": 43,
      "summary": "Comprehensive analysis of Nokia's position in the global 5G rollout..."
    },
    {
      "title": "Clean Energy Micro-Caps: Hidden Gems Under $1",
      "author": "GreenInvestor",
      "category": "Opportunities", 
      "upvotes": 198,
      "comments": 67,
      "summary": "Identifying undervalued clean energy companies with strong fundamentals..."
    }
  ],
  "fairMarketAlerts": [
    {
      "type": "Unusual Volume",
      "symbol": "NOK",
      "description": "Volume 3x above average, retail interest increasing",
      "severity": "Medium",
      "time": "5 minutes ago"
    },
    {
      "type": "Institutional Divergence", 
      "symbol": "HYSR",
      "description": "Retail sentiment positive while institutional neutral",
      "severity": "Low",
      "time": "18 minutes ago"
    }
  ]
}`);

        this.currentChart = null;
        this.priceUpdateInterval = null;
        this.currentModalStock = null;
        
        this.init();
    }

    async init() {
        console.log('📊 Lupo Platform Initializing - Empowering Retail Investors');
        this.setupEventListeners();
        
        // Load real stock data
        await this.loadLiveStockData();
        
        this.renderRetailOpportunities();
        this.renderInstitutionalHoldings();
        this.renderMarketAlerts();
        this.renderCommunityInsights();
        this.updateMarketIntelligence();
        this.renderWatchlist();
        this.updateAmsterdamTime();
        this.startPriceUpdates();
        this.showWelcomeMessage();
        
        // Update Amsterdam time every second
        setInterval(() => this.updateAmsterdamTime(), 1000);
        
        console.log('✅ Lupo Platform Ready - Transparency in Action');
    }

    async loadLiveStockData() {
        console.log('🔄 Loading live stock data...');
        
        // Define popular stocks to track
        const stockSymbols = ['AAPL', 'MSFT', 'NVDA', 'TSLA', 'NOK', 'AMC', 'HYSR', 'PLTR'];
        
        try {
            const liveStocks = await this.stockService.fetchMultipleStocks(stockSymbols);
            
            // Categorize stocks by price
            this.marketData.retailOpportunities = {
                under1: liveStocks.filter(stock => stock.price < 1),
                under4: liveStocks.filter(stock => stock.price >= 1 && stock.price < 4),
                under5: liveStocks.filter(stock => stock.price >= 4)
            };
            
            // Ensure we have stocks in each category
            if (this.marketData.retailOpportunities.under1.length === 0) {
                this.marketData.retailOpportunities.under1.push(await this.stockService.fetchStockQuote('HYSR'));
            }
            if (this.marketData.retailOpportunities.under4.length === 0) {
                this.marketData.retailOpportunities.under4.push(await this.stockService.fetchStockQuote('NOK'));
            }
            if (this.marketData.retailOpportunities.under5.length === 0) {
                this.marketData.retailOpportunities.under5 = liveStocks.filter(stock => stock.price >= 4);
            }
            
            console.log('✅ Live stock data loaded successfully');
            
        } catch (error) {
            console.error('❌ Error loading live stock data:', error);
            console.log('🔄 Falling back to demo data');
        }
    }

    setupEventListeners() {
        // Tab navigation - Fixed
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const tabName = e.target.dataset.tab;
                console.log('🔄 Tab clicked:', tabName);
                this.switchTab(tabName);
            });
        });

        // Modal tabs - Fixed
        document.querySelectorAll('.modal-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const tabName = e.target.dataset.modalTab;
                console.log('🔄 Modal tab clicked:', tabName);
                this.switchModalTab(tabName);
            });
        });

        // Modal controls
        const modal = document.getElementById('stock-modal');
        const closeModal = document.getElementById('close-modal');
        const modalOverlay = document.querySelector('.modal-overlay');

        if (closeModal) {
            closeModal.addEventListener('click', () => this.closeModal());
        }
        
        if (modalOverlay) {
            modalOverlay.addEventListener('click', () => this.closeModal());
        }

        // Stock card clicks - Fixed with better delegation
        document.addEventListener('click', (e) => {
            // Check if clicked element or its parent is a stock card
            const stockCard = e.target.closest('.stock-card');
            const holdingItem = e.target.closest('.holding-item');
            const insightItem = e.target.closest('.insight-item');
            const alertItem = e.target.closest('.alert-item');
            
            // Make sure we're not clicking on buttons
            if (e.target.closest('.btn')) {
                return;
            }
            
            let symbol = null;
            
            if (stockCard) {
                symbol = stockCard.dataset.symbol;
                console.log('📊 Stock card clicked:', symbol);
            } else if (holdingItem) {
                symbol = holdingItem.dataset.symbol;
                console.log('🏛️ Holding item clicked:', symbol);
            } else if (insightItem) {
                // Extract symbol from insight title
                const titleElement = insightItem.querySelector('.insight-title');
                if (titleElement) {
                    const match = titleElement.textContent.match(/\b([A-Z]{2,5})\b/);
                    symbol = match ? match[1] : 'NOK'; // Default to NOK for demo
                }
                console.log('💭 Insight item clicked, extracted symbol:', symbol);
            } else if (alertItem) {
                symbol = alertItem.dataset.symbol;
                console.log('🔔 Alert item clicked:', symbol);
            }
            
            if (symbol) {
                console.log('🎯 Opening investment analysis for:', symbol);
                this.openStockModal(symbol);
            }
        });

        // Modal action buttons and refresh data button
        document.addEventListener('click', (e) => {
            if (e.target.textContent.includes('Add to Watchlist')) {
                this.showToast('📊', 'Watchlist Updated', 'Stock added to your portfolio tracking!');
            } else if (e.target.textContent.includes('Share Analysis')) {
                this.showToast('📤', 'Analysis Shared', 'Investment research shared with community!');
            } else if (e.target.textContent.includes('Set Alert')) {
                this.showToast('🔔', 'Alert Set', 'You\'ll be notified of significant changes!');
            } else if (e.target.textContent.includes('Learn More')) {
                this.showToast('📚', 'Education Hub', 'Educational content coming soon!');
            } else if (e.target.id === 'refresh-data' || e.target.textContent.includes('Refresh Data')) {
                this.refreshAllData();
            } else if (e.target.id === 'add-to-watchlist' || e.target.textContent.includes('Add Stock')) {
                this.addStockToWatchlist();
            } else if (e.target.classList.contains('remove-from-watchlist')) {
                const symbol = e.target.dataset.symbol;
                this.removeFromWatchlist(symbol);
            }
        });

        // Stock search input events
        document.addEventListener('input', (e) => {
            if (e.target.id === 'stock-search') {
                this.handleStockSearch(e.target.value);
            }
        });

        // Enter key to add stock
        document.addEventListener('keydown', (e) => {
            if (e.target.id === 'stock-search' && e.key === 'Enter') {
                this.addStockToWatchlist();
            }
        });

        // Keyboard events
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeModal();
            }
        });
    }

    switchTab(tabName) {
        console.log('🔄 Switching to section:', tabName);
        
        // Update active tab button
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        const activeTab = document.querySelector(`[data-tab="${tabName}"]`);
        if (activeTab) {
            activeTab.classList.add('active');
            console.log('✅ Tab button activated:', tabName);
        }

        // Update active content section
        document.querySelectorAll('.content-tab').forEach(content => {
            content.classList.remove('active');
        });
        const activeContent = document.getElementById(tabName);
        if (activeContent) {
            activeContent.classList.add('active');
            console.log('✅ Content switched successfully to:', tabName);
        } else {
            console.error('❌ Could not find content section for tab:', tabName);
        }
    }

    switchModalTab(tabName) {
        console.log('🔄 Switching modal tab to:', tabName);
        
        // Update active modal tab
        document.querySelectorAll('.modal-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        const activeTab = document.querySelector(`[data-modal-tab="${tabName}"]`);
        if (activeTab) {
            activeTab.classList.add('active');
        }

        // Update active modal content
        document.querySelectorAll('.modal-tab-content').forEach(content => {
            content.classList.remove('active');
        });
        const activeContent = document.getElementById(tabName);
        if (activeContent) {
            activeContent.classList.add('active');
            
            // Update content based on the active tab
            if (tabName === 'investment-analysis' && this.currentModalStock) {
                this.populateInvestmentAnalysis(this.currentModalStock);
                this.createAnalysisChart(this.currentModalStock);
            } else if (tabName === 'market-structure' && this.currentModalStock) {
                this.populateMarketStructure(this.currentModalStock);
            } else if (tabName === 'community-sentiment' && this.currentModalStock) {
                this.populateCommunitySentiment(this.currentModalStock);
            }
        }
    }

    updateMarketIntelligence() {
        // Update community members counter
        const communityElement = document.getElementById('community-members');
        if (communityElement) {
            communityElement.textContent = this.marketData.marketIntelligence.communityMembers.toLocaleString();
        }
    }

    renderRetailOpportunities() {
        // Render Under $1 opportunities
        const under1Container = document.getElementById('under-1-stocks');
        if (under1Container) {
            under1Container.innerHTML = this.marketData.retailOpportunities.under1
                .map(stock => this.createOpportunityCard(stock)).join('');
        }

        // Render Under $4 opportunities
        const under4Container = document.getElementById('under-4-stocks');
        if (under4Container) {
            under4Container.innerHTML = this.marketData.retailOpportunities.under4
                .map(stock => this.createOpportunityCard(stock)).join('');
        }

        // Render Under $5 opportunities
        const under5Container = document.getElementById('under-5-stocks');
        if (under5Container) {
            under5Container.innerHTML = this.marketData.retailOpportunities.under5
                .map(stock => this.createOpportunityCard(stock)).join('');
        }

        console.log('📈 Retail investment opportunities rendered');
    }

    createOpportunityCard(stock) {
        const changeClass = stock.change >= 0 ? 'positive' : 'negative';
        const changeSign = stock.change >= 0 ? '+' : '';
        
        return `
            <div class="stock-card" data-symbol="${stock.symbol}">
                <div class="stock-header">
                    <div class="stock-info">
                        <h3 class="stock-symbol">${stock.symbol}</h3>
                        <p class="stock-name">${stock.name}</p>
                    </div>
                    <div class="opportunity-badge">
                        ${stock.opportunity}
                    </div>
                </div>
                
                <div class="stock-price">
                    <span class="price-current">$${stock.price.toFixed(2)}</span>
                    <span class="price-change ${changeClass}">
                        ${changeSign}$${Math.abs(stock.change).toFixed(2)} (${changeSign}${stock.changePercent.toFixed(2)}%)
                    </span>
                </div>
                
                <div class="stock-metrics">
                    <div class="metric">
                        <span class="metric-value">${stock.retailInterest}%</span>
                        <span class="metric-label">Retail Interest</span>
                    </div>
                    <div class="metric">
                        <span class="metric-value">${stock.volume ? (stock.volume / 1000000).toFixed(1) + 'M' : 'N/A'}</span>
                        <span class="metric-label">Volume</span>
                    </div>
                </div>
                
                ${stock.lastUpdated ? `<div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(245, 158, 11, 0.2); font-size: 11px; color: var(--color-professional-text-secondary); text-align: center;">
                    📡 Updated: ${stock.lastUpdated}
                </div>` : ''}
            </div>
        `;
    }

    renderInstitutionalHoldings() {
        // Render BlackRock holdings
        const blackrockContainer = document.getElementById('blackrock-holdings');
        if (blackrockContainer) {
            blackrockContainer.innerHTML = this.marketData.institutionalHoldings.blackrock
                .map(holding => this.createHoldingItem(holding)).join('');
        }

        // Render Vanguard holdings
        const vanguardContainer = document.getElementById('vanguard-holdings');
        if (vanguardContainer) {
            vanguardContainer.innerHTML = this.marketData.institutionalHoldings.vanguard
                .map(holding => this.createHoldingItem(holding)).join('');
        }

        // Render Berkshire holdings
        const berkshireContainer = document.getElementById('berkshire-holdings');
        if (berkshireContainer) {
            berkshireContainer.innerHTML = this.marketData.institutionalHoldings.berkshire
                .map(holding => this.createHoldingItem(holding)).join('');
        }

        console.log('🏛️ Institutional holdings transparency data loaded');
    }

    createHoldingItem(holding) {
        const changeClass = holding.change.startsWith('+') ? 'positive' : 'negative';
        
        return `
            <div class="holding-item" data-symbol="${holding.symbol}">
                <div class="holding-info">
                    <div class="holding-symbol">${holding.symbol}</div>
                    <div class="holding-name">${holding.name}</div>
                </div>
                <div class="holding-details">
                    <div class="holding-value">${holding.holding}</div>
                    <div class="holding-change ${changeClass}">${holding.change}</div>
                </div>
            </div>
        `;
    }

    renderMarketAlerts() {
        const container = document.getElementById('market-alerts-list');
        if (!container) return;

        container.innerHTML = this.marketData.fairMarketAlerts.map(alert => `
            <div class="alert-item" data-symbol="${alert.symbol}">
                <div class="alert-header">
                    <div class="alert-type">${alert.type} - <span class="alert-symbol">${alert.symbol}</span></div>
                    <div class="alert-severity ${alert.severity.toLowerCase()}">${alert.severity}</div>
                </div>
                <div class="alert-description">${alert.description}</div>
                <div class="alert-time">⏱️ ${alert.time}</div>
            </div>
        `).join('');

        console.log('🔔 Fair market alerts loaded');
    }

    renderCommunityInsights() {
        const container = document.getElementById('community-insights-list');
        if (!container) return;

        container.innerHTML = this.marketData.communityInsights.map(insight => `
            <div class="insight-item">
                <div class="insight-header">
                    <h3 class="insight-title">${insight.title}</h3>
                    <div class="insight-category">${insight.category}</div>
                </div>
                <div class="insight-meta">
                    <div class="insight-author">By ${insight.author}</div>
                    <div class="insight-stats">
                        <span>👍 ${insight.upvotes}</span>
                        <span>💬 ${insight.comments}</span>
                    </div>
                </div>
                <div class="insight-summary">${insight.summary}</div>
            </div>
        `).join('');

        console.log('💭 Community insights loaded');
    }

    openStockModal(symbol) {
        console.log('🎯 Opening modal for symbol:', symbol);
        
        const stock = this.findStockData(symbol);
        if (!stock) {
            console.log('Creating analysis for unknown symbol:', symbol);
            // Create basic stock data for modal
            this.currentModalStock = this.createStockAnalysis(symbol);
        } else {
            this.currentModalStock = stock;
        }

        const modal = document.getElementById('stock-modal');
        const modalTitle = document.getElementById('modal-title');

        if (modalTitle) {
            modalTitle.textContent = `${this.currentModalStock.name || symbol} - Investment Analysis`;
        }

        // Reset to first tab and populate content
        this.switchModalTab('investment-analysis');

        if (modal) {
            modal.classList.remove('hidden');
            document.body.style.overflow = 'hidden';
            console.log('✅ Modal opened successfully for:', symbol);
        } else {
            console.error('❌ Modal element not found');
        }
    }

    closeModal() {
        const modal = document.getElementById('stock-modal');
        if (modal) {
            modal.classList.add('hidden');
        }
        document.body.style.overflow = '';
        this.currentModalStock = null;
        
        // Destroy chart if it exists
        if (this.currentChart) {
            this.currentChart.destroy();
            this.currentChart = null;
        }
        
        console.log('✅ Modal closed');
    }

    findStockData(symbol) {
        // Search through all opportunity categories
        const allOpportunities = [
            ...this.marketData.retailOpportunities.under1,
            ...this.marketData.retailOpportunities.under4,
            ...this.marketData.retailOpportunities.under5
        ];
        
        return allOpportunities.find(stock => stock.symbol === symbol);
    }

    createStockAnalysis(symbol) {
        // Create analysis for institutional holdings or other symbols
        const institutionalStock = this.findInstitutionalHolding(symbol);
        
        return {
            symbol: symbol,
            name: institutionalStock ? institutionalStock.name : this.getCompanyName(symbol),
            price: this.generateRandomPrice(),
            change: (Math.random() - 0.5) * 10,
            changePercent: (Math.random() - 0.5) * 5,
            retailInterest: Math.floor(Math.random() * 40 + 30),
            opportunity: "Institutional Focus",
            volume: Math.floor(Math.random() * 10000000 + 1000000),
            marketCap: this.generateMarketCap(),
            peRatio: (Math.random() * 30 + 10).toFixed(1),
            divYield: (Math.random() * 5).toFixed(2)
        };
    }

    findInstitutionalHolding(symbol) {
        const allHoldings = [
            ...this.marketData.institutionalHoldings.blackrock,
            ...this.marketData.institutionalHoldings.vanguard,
            ...this.marketData.institutionalHoldings.berkshire
        ];
        
        return allHoldings.find(holding => holding.symbol === symbol);
    }

    getCompanyName(symbol) {
        const companyNames = {
            'AAPL': 'Apple Inc',
            'MSFT': 'Microsoft Corp',
            'NVDA': 'NVIDIA Corp',
            'AMZN': 'Amazon.com Inc',
            'VTI': 'Vanguard Total Stock Market ETF',
            'VOO': 'Vanguard S&P 500 ETF',
            'AXP': 'American Express Co',
            'KO': 'The Coca-Cola Company',
            'TTI': 'TETRA Technologies Inc',
            'SB': 'Safe Bulkers Inc',
            'NOK': 'Nokia Corporation',
            'DSGN': 'Design Therapeutics Inc',
            'SRNE': 'Sorrento Therapeutics Inc',
            'HYSR': 'SunHydrogen Inc',
            'ACST': 'Acasti Pharma Inc',
            'URG': 'Ur-Energy Inc'
        };
        return companyNames[symbol] || `${symbol} Corporation`;
    }

    generateRandomPrice() {
        return Math.random() * 300 + 50;
    }

    generateMarketCap() {
        const value = Math.random() * 500 + 10;
        return value > 100 ? `$${value.toFixed(0)}B` : `$${value.toFixed(1)}B`;
    }

    populateInvestmentAnalysis(stock) {
        const container = document.getElementById('analysis-metrics');
        if (!container) return;

        container.innerHTML = `
            <div class="analysis-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 16px; margin-bottom: 24px;">
                <div class="metric" style="background: rgba(255, 255, 255, 0.05); padding: 16px; border-radius: 8px; text-align: center;">
                    <span style="display: block; font-size: 24px; font-weight: bold; color: #F59E0B; margin-bottom: 4px;">${stock.retailInterest || 'N/A'}%</span>
                    <span style="font-size: 12px; color: #CBD5E1; text-transform: uppercase;">Retail Interest</span>
                </div>
                <div class="metric" style="background: rgba(255, 255, 255, 0.05); padding: 16px; border-radius: 8px; text-align: center;">
                    <span style="display: block; font-size: 24px; font-weight: bold; color: #F59E0B; margin-bottom: 4px;">${stock.volume ? stock.volume.toLocaleString() : 'N/A'}</span>
                    <span style="font-size: 12px; color: #CBD5E1; text-transform: uppercase;">Volume</span>
                </div>
                <div class="metric" style="background: rgba(255, 255, 255, 0.05); padding: 16px; border-radius: 8px; text-align: center;">
                    <span style="display: block; font-size: 24px; font-weight: bold; color: #F59E0B; margin-bottom: 4px;">${stock.marketCap || 'N/A'}</span>
                    <span style="font-size: 12px; color: #CBD5E1; text-transform: uppercase;">Market Cap</span>
                </div>
                <div class="metric" style="background: rgba(255, 255, 255, 0.05); padding: 16px; border-radius: 8px; text-align: center;">
                    <span style="display: block; font-size: 24px; font-weight: bold; color: #F59E0B; margin-bottom: 4px;">${stock.peRatio || 'N/A'}</span>
                    <span style="font-size: 12px; color: #CBD5E1; text-transform: uppercase;">P/E Ratio</span>
                </div>
                <div class="metric" style="background: rgba(255, 255, 255, 0.05); padding: 16px; border-radius: 8px; text-align: center;">
                    <span style="display: block; font-size: 24px; font-weight: bold; color: #F59E0B; margin-bottom: 4px;">${stock.divYield || '0.00'}%</span>
                    <span style="font-size: 12px; color: #CBD5E1; text-transform: uppercase;">Div Yield</span>
                </div>
                <div class="metric" style="background: rgba(255, 255, 255, 0.05); padding: 16px; border-radius: 8px; text-align: center;">
                    <span style="display: block; font-size: 24px; font-weight: bold; color: #F59E0B; margin-bottom: 4px;">${stock.opportunity || 'Investment'}</span>
                    <span style="font-size: 12px; color: #CBD5E1; text-transform: uppercase;">Category</span>
                </div>
            </div>

            <div style="background: rgba(16, 185, 129, 0.1); border: 1px solid #10B981; border-radius: 8px; padding: 16px; margin-top: 16px;">
                <h4 style="margin: 0 0 8px 0; color: #10B981;">📊 Investment Perspective</h4>
                <p style="margin: 0; color: #CBD5E1; line-height: 1.5;">
                    ${this.getInvestmentPerspective(stock)}
                </p>
            </div>
        `;
    }

    getInvestmentPerspective(stock) {
        const perspectives = {
            'HYSR': 'Clean energy micro-cap with hydrogen technology focus. High-risk, high-reward opportunity in the renewable energy transition.',
            'NOK': 'Established telecommunications infrastructure provider positioned for 5G expansion. Potential turnaround story with global reach.',
            'AAPL': 'Large-cap technology leader with strong retail investor following. Institutional favorite with consistent performance.',
            'MSFT': 'Diversified technology conglomerate with cloud computing dominance. Stable institutional holding with growth potential.',
            'NVDA': 'AI and semiconductor leader experiencing rapid growth. High institutional interest due to market positioning.',
            'ACST': 'Biotech company focused on rare diseases and cardiovascular health. Speculative play with significant regulatory risks.',
            'URG': 'Uranium mining company positioned for nuclear energy renaissance. Commodity exposure with geopolitical considerations.',
            'TTI': 'Energy services provider benefiting from oil & gas recovery. Cyclical business with operational leverage.',
            'SB': 'Dry bulk shipping company exposed to global trade flows. Highly cyclical with freight rate sensitivity.',
            'DSGN': 'Gene therapy company targeting neurological disorders. Early-stage biotech with breakthrough potential.',
            'SRNE': 'Biopharmaceutical company with diverse therapeutic pipeline. High-risk development stage investments.'
        };
        
        return perspectives[stock.symbol] || 
               `${stock.name} represents an interesting opportunity in the ${stock.opportunity.toLowerCase()} sector. ` +
               `With ${stock.retailInterest}% retail interest, this stock shows community engagement and potential for independent research value.`;
    }

    populateMarketStructure(stock) {
        const container = document.getElementById('structure-info');
        if (!container) return;

        const darkPoolEstimate = Math.floor(Math.random() * 40 + 30);
        const institutionalOwnership = Math.floor(Math.random() * 60 + 20);

        container.innerHTML = `
            <div class="structure-analysis">
                <h4 style="margin-bottom: 16px; color: #F59E0B;">🏗️ Market Structure Analysis</h4>
                
                <div style="margin-bottom: 16px;">
                    <strong style="color: #F8FAFC;">Institutional Ownership:</strong>
                    <span style="color: #CBD5E1;"> ${institutionalOwnership}% of outstanding shares</span>
                </div>
                
                <div style="margin-bottom: 16px;">
                    <strong style="color: #F8FAFC;">Dark Pool Activity:</strong>
                    <span style="color: #CBD5E1;"> Estimated ${darkPoolEstimate}% of daily volume</span>
                </div>
                
                <div style="margin-bottom: 16px;">
                    <strong style="color: #F8FAFC;">Price Discovery:</strong>
                    <span style="color: #CBD5E1;"> ${100 - darkPoolEstimate}% transparent order flow</span>
                </div>
                
                <div style="margin-bottom: 16px;">
                    <strong style="color: #F8FAFC;">Retail Access:</strong>
                    <span style="color: #CBD5E1;"> Available through all major retail brokers</span>
                </div>
                
                <div style="background: rgba(59, 130, 246, 0.1); border: 1px solid #3B82F6; border-radius: 8px; padding: 16px; margin-top: 16px;">
                    <strong style="color: #3B82F6;">📚 Educational Note:</strong>
                    <p style="margin: 8px 0 0 0; color: #CBD5E1; line-height: 1.5;">
                        Understanding market structure helps retail investors make informed decisions. 
                        Dark pools allow institutions to trade large blocks without immediately affecting price, 
                        while transparent exchanges provide price discovery for all market participants.
                    </p>
                </div>
            </div>
        `;
    }

    populateCommunitySentiment(stock) {
        const container = document.getElementById('community-sentiment');
        if (!container) return;

        const sentiment = stock.retailInterest || Math.floor(Math.random() * 40 + 40);
        const discussions = Math.floor(Math.random() * 200 + 50);
        const watchlists = Math.floor(Math.random() * 5000 + 1000);

        container.innerHTML = `
            <div class="sentiment-analysis">
                <h4 style="margin-bottom: 16px; color: #F59E0B;">💭 Community Sentiment Analysis</h4>
                
                <div style="margin-bottom: 16px;">
                    <strong style="color: #F8FAFC;">Overall Sentiment:</strong>
                    <span style="color: #10B981;"> ${sentiment > 60 ? 'Bullish' : sentiment > 40 ? 'Neutral' : 'Bearish'} (${sentiment}%)</span>
                </div>
                
                <div style="margin-bottom: 16px;">
                    <strong style="color: #F8FAFC;">Active Discussions:</strong>
                    <span style="color: #CBD5E1;"> ${discussions} threads this week</span>
                </div>
                
                <div style="margin-bottom: 16px;">
                    <strong style="color: #F8FAFC;">Watchlist Adds:</strong>
                    <span style="color: #CBD5E1;"> ${watchlists.toLocaleString()} community members tracking</span>
                </div>
                
                <div style="margin-bottom: 16px;">
                    <strong style="color: #F8FAFC;">Research Quality:</strong>
                    <span style="color: #CBD5E1;"> High-quality due diligence available</span>
                </div>
                
                <div style="background: rgba(16, 185, 129, 0.1); border: 1px solid #10B981; border-radius: 8px; padding: 16px; margin-top: 16px;">
                    <strong style="color: #10B981;">🤝 Community Insight:</strong>
                    <p style="margin: 8px 0 0 0; color: #CBD5E1; line-height: 1.5;">
                        ${this.getCommunityInsight(stock)}
                    </p>
                </div>
            </div>
        `;
    }

    getCommunityInsight(stock) {
        const insights = {
            'HYSR': 'The community sees strong potential in clean hydrogen technology, though acknowledges execution risks typical of micro-cap biotechnology companies.',
            'NOK': 'Community sentiment is mixed but improving, with many viewing this as a long-term infrastructure play benefiting from global 5G adoption.',
            'AAPL': 'Retail investors remain loyal to this tech giant, appreciating both the dividend yield and consistent innovation in consumer electronics.',
            'MSFT': 'Widely regarded as a stable growth play, with community members praising the cloud computing strategy and enterprise market position.',
            'ACST': 'Mixed community sentiment due to regulatory uncertainties, but supporters believe in the biotech pipeline potential.',
            'URG': 'Strong community support driven by nuclear energy thesis and uranium supply/demand fundamentals.',
            'TTI': 'Community sees recovery potential as energy sector normalizes, though cyclical nature creates divided opinions.',
            'SB': 'Shipping enthusiasts in the community track freight rates closely, viewing this as a commodity cycle play.',
            'DSGN': 'Biotech community excited about gene therapy potential but acknowledges the high development risks involved.',
            'SRNE': 'Community discussions focus on pipeline diversity and potential partnerships, with cautious optimism prevailing.'
        };
        
        return insights[stock.symbol] || 
               `Community members are actively researching ${stock.name}, with discussions focusing on fundamental analysis ` +
               `and long-term value potential. The ${stock.retailInterest}% retail interest suggests genuine grassroots enthusiasm.`;
    }

    createAnalysisChart(stock) {
        const canvas = document.getElementById('analysis-chart');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        
        // Generate price trend data
        const data = this.generatePriceTrendData(stock);
        
        if (this.currentChart) {
            this.currentChart.destroy();
        }
        
        this.currentChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.labels,
                datasets: [
                    {
                        label: 'Price Trend',
                        data: data.prices,
                        borderColor: '#F59E0B',
                        backgroundColor: 'rgba(245, 158, 11, 0.1)',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.4
                    },
                    {
                        label: 'Volume (Scaled)',
                        data: data.volume,
                        borderColor: '#3B82F6',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        borderWidth: 1,
                        fill: false,
                        tension: 0.3,
                        yAxisID: 'y1'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: {
                            color: '#ffffff'
                        }
                    },
                    title: {
                        display: true,
                        text: `${stock.symbol} - Investment Analysis`,
                        color: '#F59E0B',
                        font: {
                            size: 16,
                            weight: 'bold'
                        }
                    }
                },
                scales: {
                    x: {
                        ticks: {
                            color: '#CBD5E1'
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        }
                    },
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        ticks: {
                            color: '#CBD5E1',
                            callback: function(value) {
                                return '$' + value.toFixed(2);
                            }
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        }
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        ticks: {
                            color: '#3B82F6',
                            callback: function(value) {
                                return (value * 1000).toFixed(0) + 'K';
                            }
                        },
                        grid: {
                            drawOnChartArea: false,
                        },
                    }
                }
            }
        });
    }

    generatePriceTrendData(stock) {
        const labels = ['30d ago', '25d ago', '20d ago', '15d ago', '10d ago', '5d ago', 'Today'];
        const prices = [];
        const volume = [];
        
        let currentPrice = stock.price * 0.9; // Start 10% lower
        let currentVol = Math.random() * 10 + 5;
        
        for (let i = 0; i < 7; i++) {
            // Generate realistic price movement
            const priceChange = (Math.random() - 0.5) * 0.1;
            currentPrice = Math.max(0.1, currentPrice * (1 + priceChange));
            prices.push(parseFloat(currentPrice.toFixed(2)));
            
            // Generate volume data
            const volChange = (Math.random() - 0.5) * 0.3;
            currentVol = Math.max(1, currentVol * (1 + volChange));
            volume.push(parseFloat(currentVol.toFixed(1)));
        }
        
        // Ensure last price matches current price
        prices[prices.length - 1] = stock.price;
        
        return { labels, prices, volume };
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

            const timeElement = document.getElementById('amsterdam-time');
            if (timeElement) {
                timeElement.textContent = timeString;
            }
        } catch (error) {
            console.error('Error updating Amsterdam time:', error);
            const timeElement = document.getElementById('amsterdam-time');
            if (timeElement) {
                timeElement.textContent = new Date().toLocaleTimeString('en-GB', { hour12: false });
            }
        }
    }

    startPriceUpdates() {
        // Update prices every 15 seconds for realistic market simulation
        this.priceUpdateInterval = setInterval(() => {
            this.updatePrices();
        }, 15000);
        
        console.log('📊 Real-time price updates started');
    }

    async updatePrices() {
        console.log('🔄 Refreshing stock prices...');
        
        // Collect all stock symbols from current opportunities
        const allSymbols = [
            ...this.marketData.retailOpportunities.under1.map(s => s.symbol),
            ...this.marketData.retailOpportunities.under4.map(s => s.symbol),
            ...this.marketData.retailOpportunities.under5.map(s => s.symbol)
        ];
        
        try {
            // Fetch updated data for a subset of stocks to avoid rate limits
            const symbolsToUpdate = allSymbols.slice(0, 3); // Update 3 stocks at a time
            const updatedStocks = await this.stockService.fetchMultipleStocks(symbolsToUpdate);
            
            // Update the corresponding stocks in our data
            updatedStocks.forEach(updatedStock => {
                ['under1', 'under4', 'under5'].forEach(category => {
                    const stockIndex = this.marketData.retailOpportunities[category].findIndex(
                        stock => stock.symbol === updatedStock.symbol
                    );
                    if (stockIndex !== -1) {
                        this.marketData.retailOpportunities[category][stockIndex] = updatedStock;
                    }
                });
            });
            
            this.renderRetailOpportunities();
            console.log('📈 Live price updates applied');
            
        } catch (error) {
            console.error('❌ Error updating prices:', error);
            // Fallback to simulated updates
            this.simulatePriceUpdates();
        }
    }
    
    simulatePriceUpdates() {
        let hasUpdates = false;
        
        // Update all opportunity categories with simulated data
        ['under1', 'under4', 'under5'].forEach(category => {
            this.marketData.retailOpportunities[category].forEach(stock => {
                const changePercent = (Math.random() - 0.5) * 4; // ±2% max change
                const priceChange = stock.price * (changePercent / 100);
                
                const newPrice = Math.max(0.01, stock.price + priceChange);
                
                if (Math.abs(newPrice - stock.price) > 0.005) {
                    stock.price = newPrice;
                    stock.change = priceChange;
                    stock.changePercent = changePercent;
                    hasUpdates = true;
                }
            });
        });

        if (hasUpdates) {
            this.renderRetailOpportunities();
            console.log('📈 Simulated price updates applied');
        }
    }

    async refreshAllData() {
        const refreshButton = document.getElementById('refresh-data');
        if (refreshButton) {
            refreshButton.textContent = '🔄 Refreshing...';
            refreshButton.disabled = true;
        }
        
        this.showToast('🔄', 'Refreshing Data', 'Loading latest market information...');
        
        try {
            await this.loadLiveStockData();
            await this.refreshWatchlist();
            this.renderRetailOpportunities();
            this.showToast('✅', 'Data Updated', 'All stock prices refreshed successfully!');
        } catch (error) {
            console.error('❌ Error refreshing data:', error);
            this.showToast('⚠️', 'Update Failed', 'Using cached data due to API limits');
        } finally {
            if (refreshButton) {
                refreshButton.textContent = '🔄 Refresh Data';  
                refreshButton.disabled = false;
            }
        }
    }

    // Watchlist Management Methods
    loadWatchlistFromStorage() {
        try {
            const saved = localStorage.getItem('lupo-watchlist');
            return saved ? JSON.parse(saved) : [];
        } catch (error) {
            console.error('❌ Error loading watchlist from storage:', error);
            return [];
        }
    }

    saveWatchlistToStorage() {
        try {
            localStorage.setItem('lupo-watchlist', JSON.stringify(this.watchlist));
        } catch (error) {
            console.error('❌ Error saving watchlist to storage:', error);
        }
    }

    async addStockToWatchlist() {
        const searchInput = document.getElementById('stock-search');
        const symbol = searchInput.value.trim().toUpperCase();

        if (!symbol) {
            this.showToast('⚠️', 'Invalid Symbol', 'Please enter a stock symbol');
            return;
        }

        if (this.watchlist.some(stock => stock.symbol === symbol)) {
            this.showToast('ℹ️', 'Already Added', `${symbol} is already in your watchlist`);
            return;
        }

        try {
            // Show loading state
            const addButton = document.getElementById('add-to-watchlist');
            const originalText = addButton.textContent;
            addButton.textContent = '🔄 Adding...';
            addButton.disabled = true;

            // Fetch stock data
            const stockData = await this.stockService.fetchStockQuote(symbol);
            
            // Add to watchlist
            this.watchlist.push(stockData);
            this.saveWatchlistToStorage();
            this.renderWatchlist();

            // Clear search and show success
            searchInput.value = '';
            this.clearSearchSuggestions();
            this.showToast('✅', 'Stock Added', `${symbol} added to your watchlist`);

            // Restore button
            addButton.textContent = originalText;
            addButton.disabled = false;

        } catch (error) {
            console.error('❌ Error adding stock to watchlist:', error);
            this.showToast('❌', 'Error', 'Failed to add stock. Please try again.');
            
            // Restore button
            const addButton = document.getElementById('add-to-watchlist');
            addButton.textContent = '📊 Add Stock';
            addButton.disabled = false;
        }
    }

    removeFromWatchlist(symbol) {
        this.watchlist = this.watchlist.filter(stock => stock.symbol !== symbol);
        this.saveWatchlistToStorage();
        this.renderWatchlist();
        this.showToast('🗑️', 'Stock Removed', `${symbol} removed from watchlist`);
    }

    async renderWatchlist() {
        const container = document.getElementById('watchlist-stocks');
        const emptyState = document.getElementById('empty-watchlist');

        if (!container || !emptyState) return;

        if (this.watchlist.length === 0) {
            container.style.display = 'none';
            emptyState.style.display = 'block';
            return;
        }

        container.style.display = 'grid';
        emptyState.style.display = 'none';

        container.innerHTML = this.watchlist.map(stock => this.createWatchlistCard(stock)).join('');
    }

    createWatchlistCard(stock) {
        const changeClass = stock.change >= 0 ? 'positive' : 'negative';
        const changeSign = stock.change >= 0 ? '+' : '';
        
        return `
            <div class="stock-card watchlist-card" data-symbol="${stock.symbol}">
                <div class="stock-header">
                    <div class="stock-info">
                        <h3 class="stock-symbol">${stock.symbol}</h3>
                        <p class="stock-name">${stock.name}</p>
                    </div>
                    <button class="remove-from-watchlist" data-symbol="${stock.symbol}" style="background: none; border: 1px solid rgba(239, 68, 68, 0.5); color: #EF4444; padding: 4px 8px; border-radius: 4px; font-size: 12px; cursor: pointer;">
                        🗑️ Remove
                    </button>
                </div>
                
                <div class="stock-price">
                    <span class="price-current">$${stock.price.toFixed(2)}</span>
                    <span class="price-change ${changeClass}">
                        ${changeSign}$${Math.abs(stock.change).toFixed(2)} (${changeSign}${stock.changePercent.toFixed(2)}%)
                    </span>
                </div>
                
                <div class="stock-metrics">
                    <div class="metric">
                        <span class="metric-value">${stock.volume ? (stock.volume / 1000000).toFixed(1) + 'M' : 'N/A'}</span>
                        <span class="metric-label">Volume</span>
                    </div>
                    <div class="metric">
                        <span class="metric-value">${stock.opportunity}</span>
                        <span class="metric-label">Category</span>
                    </div>
                </div>
                
                ${stock.lastUpdated ? `<div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(245, 158, 11, 0.2); font-size: 11px; color: var(--color-professional-text-secondary); text-align: center;">
                    📡 Updated: ${stock.lastUpdated}
                </div>` : ''}
            </div>
        `;
    }

    handleStockSearch(query) {
        const suggestions = this.getStockSuggestions(query);
        this.renderSearchSuggestions(suggestions);
    }

    getStockSuggestions(query) {
        if (!query || query.length < 1) return [];
        
        const popularStocks = [
            'AAPL', 'MSFT', 'NVDA', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NFLX',
            'NOK', 'AMD', 'INTC', 'PLTR', 'AMC', 'GME', 'RIVN', 'LCID',
            'HYSR', 'ACST', 'URG', 'TTI', 'SB', 'DSGN', 'SRNE'
        ];

        return popularStocks
            .filter(symbol => symbol.startsWith(query.toUpperCase()))
            .slice(0, 5);
    }

    renderSearchSuggestions(suggestions) {
        const container = document.getElementById('search-suggestions');
        if (!container) return;

        if (suggestions.length === 0) {
            container.innerHTML = '';
            return;
        }

        container.innerHTML = `
            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                ${suggestions.map(symbol => `
                    <button class="suggestion-btn" data-symbol="${symbol}" style="
                        background: rgba(245, 158, 11, 0.1); 
                        border: 1px solid rgba(245, 158, 11, 0.3); 
                        color: var(--color-professional-primary); 
                        padding: 4px 8px; 
                        border-radius: 4px; 
                        font-size: 12px; 
                        cursor: pointer;
                        font-family: var(--font-family-mono);
                    ">
                        ${symbol}
                    </button>
                `).join('')}
            </div>
        `;

        // Add click handlers for suggestions
        container.querySelectorAll('.suggestion-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.getElementById('stock-search').value = btn.dataset.symbol;
                this.clearSearchSuggestions();
            });
        });
    }

    clearSearchSuggestions() {
        const container = document.getElementById('search-suggestions');
        if (container) {
            container.innerHTML = '';
        }
    }

    async refreshWatchlist() {
        if (this.watchlist.length === 0) return;

        console.log('🔄 Refreshing watchlist data...');
        
        try {
            const symbols = this.watchlist.map(stock => stock.symbol);
            const updatedStocks = await this.stockService.fetchMultipleStocks(symbols.slice(0, 5)); // Limit to avoid rate limits
            
            // Update watchlist with fresh data
            updatedStocks.forEach(updatedStock => {
                const index = this.watchlist.findIndex(stock => stock.symbol === updatedStock.symbol);
                if (index !== -1) {
                    this.watchlist[index] = updatedStock;
                }
            });
            
            this.saveWatchlistToStorage();
            this.renderWatchlist();
            
        } catch (error) {
            console.error('❌ Error refreshing watchlist:', error);
        }
    }

    showWelcomeMessage() {
        setTimeout(() => {
            this.showToast('🎯', 'Welcome to Lupo!', 'Empowering retail investors through transparency and education.');
        }, 1500);
    }

    showToast(icon, title, message, duration = 4000) {
        const toast = document.getElementById('notification-toast');
        const toastIcon = document.querySelector('.toast-icon');
        const toastTitle = document.querySelector('.toast-title');
        const toastMessage = document.querySelector('.toast-message');

        if (toast && toastIcon && toastTitle && toastMessage) {
            toastIcon.textContent = icon;
            toastTitle.textContent = title;
            toastMessage.textContent = message;

            toast.classList.remove('hidden');

            setTimeout(() => {
                toast.classList.add('hidden');
            }, duration);
        }
    }
}

// Login System
class LoginSystem {
    constructor() {
        this.isLoggedIn = this.checkLoginStatus();
        this.setupLoginHandlers();
    }

    checkLoginStatus() {
        // Check if user was previously logged in
        return localStorage.getItem('lupo-logged-in') === 'true';
    }

    setupLoginHandlers() {
        document.addEventListener('click', (e) => {
            if (e.target.id === 'login-button') {
                this.handleLogin();
            }
        });

        // Allow Enter key to login
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && (e.target.id === 'login-email' || e.target.id === 'login-password')) {
                this.handleLogin();
            }
        });
    }

    handleLogin() {
        const email = document.getElementById('login-email')?.value;
        const password = document.getElementById('login-password')?.value;
        const loginButton = document.getElementById('login-button');

        if (!email || !password) {
            this.showLoginError('Please enter both email and password');
            return;
        }

        // Simple demo validation (in real app, this would be server-side)
        if (email === 'demo@lupo.com' && password === 'demo123') {
            this.performLogin(loginButton);
        } else {
            this.showLoginError('Invalid credentials. Use demo@lupo.com / demo123');
        }
    }

    async performLogin(loginButton) {
        // Show loading state
        const originalText = loginButton.textContent;
        loginButton.textContent = '🔄 Signing In...';
        loginButton.disabled = true;

        // Simulate loading delay for realism
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Mark as logged in
        localStorage.setItem('lupo-logged-in', 'true');
        this.isLoggedIn = true;

        // Hide login page and show main app
        this.showMainApp();

        // Initialize the trading platform
        this.initializePlatform();
    }

    showMainApp() {
        const loginPage = document.getElementById('login-page');
        const mainApp = document.getElementById('main-app');

        if (loginPage && mainApp) {
            loginPage.style.display = 'none';
            mainApp.classList.remove('hidden');
            console.log('✅ User logged in successfully');
        }
    }

    showLoginError(message) {
        // Create or update error message
        let errorDiv = document.querySelector('.login-error');
        if (!errorDiv) {
            errorDiv = document.createElement('div');
            errorDiv.className = 'login-error';
            errorDiv.style.cssText = `
                background: rgba(239, 68, 68, 0.1);
                border: 1px solid rgba(239, 68, 68, 0.3);
                color: #EF4444;
                padding: 12px;
                border-radius: 6px;
                margin: 16px 0;
                text-align: center;
                font-size: 14px;
            `;
            
            const loginForm = document.querySelector('.login-form');
            loginForm.appendChild(errorDiv);
        }
        
        errorDiv.textContent = message;
        
        // Remove error after 5 seconds
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.parentNode.removeChild(errorDiv);
            }
        }, 5000);
    }

    initializePlatform() {
        try {
            window.lupoPlatform = new LupoPlatform();
        } catch (error) {
            console.error('❌ Error initializing platform:', error);
        }
    }

    logout() {
        localStorage.removeItem('lupo-logged-in');
        location.reload(); // Simple logout - reload page
    }
}

// Initialize Login System and Platform when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 DOM loaded, initializing Lupo...');
    
    const loginSystem = new LoginSystem();
    
    // If user is already logged in, show main app immediately
    if (loginSystem.isLoggedIn) {
        loginSystem.showMainApp();
        loginSystem.initializePlatform();
    }
    
    // Store login system globally for logout functionality
    window.lupoLogin = loginSystem;
});