/**
 * Lupo Trading Platform - Main Application
 * Modular architecture with service-based components
 */

class LupoPlatform {
    constructor() {
        // Initialize services
        this.authService = new AuthService();
        this.stockService = new StockService();
        this.portfolioService = new PortfolioService();
        this.notificationService = new NotificationService();
        this.tradeModal = new TradeModal(this.portfolioService, this.notificationService);
        this.passwordReset = new PasswordReset(this.authService, this.notificationService);
        this.userProfile = new UserProfile(this.authService, this.notificationService);
        this.portfolioDashboard = new PortfolioDashboard(this.portfolioService, this.notificationService);
        this.realTimeService = new RealTimeService(this.stockService, this.notificationService);
        this.realTimePrices = new RealTimePrices(this.realTimeService, this.notificationService);
        this.technicalChart = new TechnicalChart(this.stockService, this.realTimeService, this.notificationService);
        this.themeToggle = new ThemeToggle();

        // Application state
        this.currentStock = null;
        this.watchlist = [];
        this.portfolio = null;
        this.marketData = {
            retailOpportunities: {
                under1: [],
                under4: [],
                under5: []
            }
        };

        // Check authentication
        this.checkAuthentication();
    }

    async checkAuthentication() {
        console.log('🔍 Checking authentication...');
        
        const token = this.authService.getToken();
        console.log('Token exists:', !!token);
        
        if (!this.authService.isAuthenticated()) {
            console.log('❌ Not authenticated - showing login form');
            this.showLoginForm();
            return;
        }

        console.log('✅ Token found, verifying...');
        
        // Verify token validity
        const isValid = await this.authService.verifyToken();
        console.log('Token valid:', isValid);
        
        if (!isValid) {
            console.log('❌ Token invalid - showing login form');
            this.showLoginForm();
            return;
        }

        console.log('✅ Authentication successful - initializing app');
        // Initialize authenticated app
        await this.initializeApp();
    }

    showLoginForm() {
        const loginPage = document.getElementById('login-page');
        const mainApp = document.getElementById('main-app');
        
        if (loginPage) loginPage.classList.remove('hidden');
        if (mainApp) mainApp.classList.add('hidden');
    }

    async initializeApp() {
        console.log('🚀 Initializing Lupo Trading Platform...');
        
        // Show main app
        const loginPage = document.getElementById('login-page');
        const mainApp = document.getElementById('main-app');
        
        if (loginPage) loginPage.classList.add('hidden');
        if (mainApp) mainApp.classList.remove('hidden');

        // Update auth tokens in services
        this.stockService.updateAuthToken();
        this.portfolioService.updateAuthToken();

        // Setup event listeners
        this.setupEventListeners();
        
        // Load initial data
        await this.loadInitialData();

        // Setup periodic updates
        this.startPeriodicUpdates();
        
        // Start real-time price tracking
        this.startRealTimeTracking();
        
        console.log('✅ Lupo Platform Ready - Transparency in Action');
    }

    async loadInitialData() {
        try {
            // Load data in parallel
            const [opportunities, portfolio, watchlist] = await Promise.all([
                this.stockService.getOpportunities(),
                this.portfolioService.getPortfolio(),
                this.portfolioService.getWatchlist()
            ]);

            // Update application state
            if (opportunities) {
                this.marketData.retailOpportunities = opportunities;
            }
            
            this.portfolio = portfolio;
            this.watchlist = watchlist || [];

            // Render UI components
            this.renderAll();
            
        } catch (error) {
            console.error('❌ Error loading initial data:', error);
            this.notificationService.error('Loading Error', 'Failed to load market data');
        }
    }

    renderAll() {
        this.renderRetailOpportunities();
        this.renderPortfolio();
        this.renderWatchlist();
        this.renderMarketIntelligence();
        this.updateAmsterdamTime();
    }

    setupEventListeners() {
        // Navigation tabs
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const tabName = e.target.dataset.tab;
                this.switchTab(tabName);
            });
        });

        // Modal tabs
        document.querySelectorAll('.modal-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const tabName = e.target.dataset.modalTab;
                this.switchModalTab(tabName);
            });
        });

        // Modal controls
        const closeModal = document.getElementById('close-modal');
        const modalOverlay = document.querySelector('.modal-overlay');

        if (closeModal) {
            closeModal.addEventListener('click', () => this.closeModal());
        }
        
        if (modalOverlay) {
            modalOverlay.addEventListener('click', () => this.closeModal());
        }

        // Stock card clicks
        document.addEventListener('click', (e) => {
            const stockCard = e.target.closest('.stock-card');
            if (stockCard && !e.target.closest('.btn')) {
                const symbol = stockCard.dataset.symbol;
                this.openStockModal(symbol);
            }
        });

        // Trade modal handlers
        document.addEventListener('click', async (e) => {
            if (e.target.id === 'buy-stock' || e.target.closest('#buy-stock')) {
                e.preventDefault();
                await this.tradeModal.show('buy', this.currentStock);
            } else if (e.target.id === 'sell-stock' || e.target.closest('#sell-stock')) {
                e.preventDefault();
                await this.tradeModal.show('sell', this.currentStock);
            } else if (e.target.id === 'add-to-watchlist-modal' || e.target.closest('#add-to-watchlist-modal')) {
                e.preventDefault();
                await this.addToWatchlist();
            }
        });

        // Refresh data button
        document.addEventListener('click', (e) => {
            if (e.target.id === 'refresh-data' || e.target.closest('#refresh-data')) {
                this.refreshAllData();
            }
        });

        // Portfolio update events
        document.addEventListener('portfolioUpdate', () => {
            this.refreshPortfolioData();
        });

        // Escape key to close modals
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeModal();
            }
        });
    }

    async openStockModal(symbol) {
        try {
            // Fetch current stock data
            const stockData = await this.stockService.fetchStockQuote(symbol);
            this.currentStock = stockData;

            // Show modal
            const modal = document.getElementById('stock-modal');
            const modalTitle = document.getElementById('modal-title');
            
            if (modalTitle) {
                modalTitle.textContent = `${stockData.symbol} - Investment Analysis`;
            }

            // Populate modal content
            this.populateModalContent(stockData);
            
            // Show modal
            modal.classList.remove('hidden');
            
            // Trigger technical chart loading
            document.dispatchEvent(new CustomEvent('openStockModal', { detail: symbol }));
            
        } catch (error) {
            console.error('❌ Error opening stock modal:', error);
            this.notificationService.error('Error', 'Failed to load stock data');
        }
    }

    populateModalContent(stock) {
        // Populate investment analysis
        this.populateInvestmentAnalysis(stock);
        
        // Switch to first tab
        this.switchModalTab('investment-analysis');
    }

    populateInvestmentAnalysis(stock) {
        const container = document.getElementById('analysis-metrics');
        if (!container) return;

        const metrics = [
            { label: 'Current Price', value: `$${stock.price.toFixed(2)}`, type: 'price' },
            { label: 'Price Change', value: `${stock.change >= 0 ? '+' : ''}${stock.change.toFixed(2)}`, type: stock.change >= 0 ? 'positive' : 'negative' },
            { label: 'Change %', value: `${stock.changePercent.toFixed(2)}%`, type: stock.changePercent >= 0 ? 'positive' : 'negative' },
            { label: 'Volume', value: stock.volume.toLocaleString(), type: 'neutral' },
            { label: 'Opportunity', value: stock.opportunity, type: 'category' }
        ];

        container.innerHTML = metrics.map(metric => `
            <div class="metric">
                <span class="metric-value ${metric.type}">${metric.value}</span>
                <span class="metric-label">${metric.label}</span>
            </div>
        `).join('');
    }

    renderRetailOpportunities() {
        const categories = [
            { id: 'under-1-stocks', key: 'under1', title: 'Under $1' },
            { id: 'under-4-stocks', key: 'under4', title: 'Under $4' },
            { id: 'under-5-stocks', key: 'under5', title: 'Over $4' }
        ];

        categories.forEach(category => {
            const container = document.getElementById(category.id);
            if (!container) return;

            const stocks = this.marketData.retailOpportunities[category.key] || [];
            
            if (stocks.length === 0) {
                container.innerHTML = '<div class="no-data">Loading opportunities...</div>';
                return;
            }

            container.innerHTML = stocks.map(stock => this.createStockCard(stock)).join('');
        });
    }

    createStockCard(stock) {
        const changeClass = stock.change >= 0 ? 'positive' : 'negative';
        const changePrefix = stock.change >= 0 ? '+' : '';
        
        return `
            <div class="stock-card" data-symbol="${stock.symbol}" tabindex="0">
                <div class="stock-header">
                    <h4 class="stock-symbol">${stock.symbol}</h4>
                    <span class="stock-price">$${stock.price.toFixed(2)}</span>
                </div>
                <p class="stock-name">${stock.name}</p>
                <div class="stock-metrics">
                    <span class="price-change ${changeClass}">
                        ${changePrefix}${stock.change.toFixed(2)} (${stock.changePercent.toFixed(2)}%)
                    </span>
                    <span class="retail-interest">${stock.retailInterest || 45}% retail</span>
                </div>
            </div>
        `;
    }

    renderWatchlist() {
        const container = document.getElementById('watchlist-stocks');
        if (!container) return;

        if (this.watchlist.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <p>Your watchlist is empty</p>
                    <small>Click on any stock to add it to your watchlist</small>
                </div>
            `;
            return;
        }

        container.innerHTML = this.watchlist.map(stock => this.createStockCard(stock)).join('');
    }

    renderPortfolio() {
        // Portfolio rendering is now handled by PortfolioDashboard component
        if (this.portfolioDashboard) {
            this.portfolioDashboard.refresh();
        }
    }

    renderMarketIntelligence() {
        // Update market intelligence cards with real data
        this.updateMarketStats();
    }

    updateMarketStats() {
        // Update community members count
        const membersElement = document.getElementById('community-members');
        if (membersElement) {
            const count = 45000 + Math.floor(Math.random() * 1000);
            membersElement.textContent = count.toLocaleString();
        }
    }

    updateAmsterdamTime() {
        const timeElement = document.getElementById('amsterdam-time');
        if (timeElement) {
            const now = new Date();
            const amsterdamTime = new Date(now.toLocaleString("en-US", {timeZone: "Europe/Amsterdam"}));
            timeElement.textContent = amsterdamTime.toLocaleTimeString('en-US', { 
                hour12: false,
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
        }
    }

    async addToWatchlist() {
        if (!this.currentStock) {
            this.notificationService.warning('Error', 'Please select a stock first');
            return;
        }

        try {
            await this.portfolioService.addToWatchlist(this.currentStock.symbol);
            
            // Update local watchlist
            if (!this.watchlist.find(stock => stock.symbol === this.currentStock.symbol)) {
                this.watchlist.push(this.currentStock);
                this.renderWatchlist();
            }

            this.notificationService.success('Added to Watchlist', `${this.currentStock.symbol} is now being tracked`);
        } catch (error) {
            console.error('❌ Error adding to watchlist:', error);
            this.notificationService.error('Error', 'Failed to add stock to watchlist');
        }
    }

    async refreshAllData() {
        const refreshButton = document.getElementById('refresh-data');
        if (refreshButton) {
            refreshButton.disabled = true;
            refreshButton.innerHTML = '<span class="refresh-icon"></span><span class="btn-text">Refreshing...</span>';
        }

        try {
            await this.loadInitialData();
            this.notificationService.success('Data Refreshed', 'Market data updated successfully');
        } catch (error) {
            console.error('❌ Error refreshing data:', error);
            this.notificationService.error('Refresh Failed', 'Failed to update market data');
        } finally {
            if (refreshButton) {
                refreshButton.disabled = false;
                refreshButton.innerHTML = '<span class="refresh-icon"></span><span class="btn-text">Refresh Data</span>';
            }
        }
    }

    async refreshPortfolioData() {
        try {
            this.portfolio = await this.portfolioService.getPortfolio();
            this.renderPortfolio();
        } catch (error) {
            console.error('❌ Error refreshing portfolio:', error);
        }
    }

    switchTab(tabName) {
        // Hide all content tabs
        document.querySelectorAll('.content-tab').forEach(tab => {
            tab.classList.remove('active');
        });

        // Remove active class from nav tabs
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.classList.remove('active');
        });

        // Show selected content tab
        const contentTab = document.getElementById(tabName);
        if (contentTab) {
            contentTab.classList.add('active');
        }

        // Add active class to clicked nav tab
        const navTab = document.querySelector(`[data-tab="${tabName}"]`);
        if (navTab) {
            navTab.classList.add('active');
        }
    }

    switchModalTab(tabName) {
        // Hide all modal content tabs
        document.querySelectorAll('.modal-tab-content').forEach(tab => {
            tab.classList.remove('active');
        });

        // Remove active class from modal tabs
        document.querySelectorAll('.modal-tab').forEach(tab => {
            tab.classList.remove('active');
        });

        // Show selected modal content tab
        const contentTab = document.getElementById(tabName);
        if (contentTab) {
            contentTab.classList.add('active');
        }

        // Add active class to clicked modal tab
        const modalTab = document.querySelector(`[data-modal-tab="${tabName}"]`);
        if (modalTab) {
            modalTab.classList.add('active');
        }
    }

    closeModal() {
        const modal = document.getElementById('stock-modal');
        if (modal) {
            modal.classList.add('hidden');
        }
        this.currentStock = null;
    }

    startPeriodicUpdates() {
        // Update Amsterdam time every second
        setInterval(() => this.updateAmsterdamTime(), 1000);

        // Update market data every 5 minutes
        setInterval(() => this.refreshAllData(), 5 * 60 * 1000);

        // Start token refresh monitoring
        this.authService.startTokenRefresh();
    }

    startRealTimeTracking() {
        console.log('📊 Starting real-time price tracking...');
        
        // Get all symbols currently displayed
        const symbols = this.getAllDisplayedSymbols();
        
        if (symbols.length > 0) {
            console.log(`👁️ Tracking ${symbols.length} symbols:`, symbols);
            this.realTimeService.watchSymbols(symbols);
        }
        
        // Listen for new symbols to track
        document.addEventListener('symbolAdded', (e) => {
            const symbol = e.detail;
            console.log(`➕ Adding ${symbol} to real-time tracking`);
            this.realTimePrices.addSymbolToWatch(symbol);
        });
        
        document.addEventListener('symbolRemoved', (e) => {
            const symbol = e.detail;
            console.log(`➖ Removing ${symbol} from real-time tracking`);
            this.realTimePrices.removeSymbolFromWatch(symbol);
        });
    }

    getAllDisplayedSymbols() {
        const symbols = new Set();
        
        // Get symbols from opportunities
        Object.values(this.marketData.retailOpportunities).forEach(category => {
            category.forEach(stock => symbols.add(stock.symbol));
        });
        
        // Get symbols from watchlist
        this.watchlist.forEach(stock => symbols.add(stock.symbol));
        
        // Get symbols from portfolio
        if (this.portfolio?.holdings) {
            this.portfolio.holdings.forEach(holding => symbols.add(holding.symbol));
        }
        
        return Array.from(symbols);
    }
}

// Theme Toggle Component (keeping existing functionality)
class ThemeToggle {
    constructor() {
        this.init();
    }

    init() {
        const savedTheme = localStorage.getItem('lupo-theme') || 'light';
        this.setTheme(savedTheme);
        
        const loginToggle = document.getElementById('theme-toggle');
        const mainToggle = document.getElementById('main-theme-toggle');
        
        if (loginToggle) {
            loginToggle.checked = savedTheme === 'dark';
            loginToggle.addEventListener('change', (e) => {
                const newTheme = e.target.checked ? 'dark' : 'light';
                this.setTheme(newTheme);
                localStorage.setItem('lupo-theme', newTheme);
                this.syncToggles(newTheme);
            });
        }
        
        if (mainToggle) {
            mainToggle.checked = savedTheme === 'dark';
            mainToggle.addEventListener('change', (e) => {
                const newTheme = e.target.checked ? 'dark' : 'light';
                this.setTheme(newTheme);
                localStorage.setItem('lupo-theme', newTheme);
                this.syncToggles(newTheme);
            });
        }
    }
    
    syncToggles(theme) {
        const isDark = theme === 'dark';
        const loginToggle = document.getElementById('theme-toggle');
        const mainToggle = document.getElementById('main-theme-toggle');
        
        if (loginToggle) loginToggle.checked = isDark;
        if (mainToggle) mainToggle.checked = isDark;
    }

    setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        
        const body = document.body;
        body.classList.remove('light-theme', 'dark-theme');
        body.classList.add(`${theme}-theme`);
    }
}

// Login System (keeping existing functionality but using AuthService)
class LoginSystem {
    constructor() {
        this.authService = new AuthService();
        this.notificationService = new NotificationService();
        this.passwordReset = new PasswordReset(this.authService, this.notificationService);
        this.init();
    }

    init() {
        const loginButton = document.getElementById('login-button');
        if (loginButton) {
            loginButton.addEventListener('click', (e) => this.handleLogin(e));
        }

        // Pre-fill remembered email
        const emailInput = document.getElementById('login-email');
        if (emailInput) {
            emailInput.value = this.authService.getRememberedEmail();
        }
    }

    async handleLogin(e) {
        e.preventDefault();
        
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        const rememberMe = document.getElementById('remember-me').checked;
        const loginButton = document.querySelector('.login-btn');

        if (!email || !password) {
            this.notificationService.error('Login Error', 'Please fill in all fields');
            return;
        }

        // Show loading state
        loginButton.disabled = true;
        const btnText = loginButton.querySelector('.btn-text');
        const originalText = btnText.textContent;
        btnText.textContent = 'Signing In...';

        try {
            await this.authService.login(email, password, rememberMe);
            
            // Trigger page reload to initialize authenticated app
            window.location.reload();
            
        } catch (error) {
            console.error('❌ Login failed:', error);
            this.notificationService.error('Login Failed', error.message || 'Invalid credentials');
        } finally {
            // Reset button state (only if we didn't reload)
            if (loginButton) {
                loginButton.disabled = false;
                btnText.textContent = originalText;
            }
        }
    }
}

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 DOM loaded, initializing Lupo...');
    
    // Initialize theme toggle first
    new ThemeToggle();
    
    // Initialize login system
    new LoginSystem();
    
    // If already authenticated, initialize main platform
    const authService = new AuthService();
    if (authService.isAuthenticated()) {
        new LupoPlatform();
    }
});