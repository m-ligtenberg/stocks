/**
 * Lupo Trading Platform - Application Manager
 * Enhanced architecture with centralized state management and service coordination
 */
class AppManager {
    constructor() {
        console.log('ðŸš€ Initializing Lupo Trading Platform with Centralized State Management...');
        
        // Core state and synchronization - initialize if not ready
        this.appState = window.lupoAppState || window.createAppStateManager?.();
        this.stateSync = window.lupoStateSync || window.createStateSyncService?.();
        
        // Service instances (will be registered with state sync)
        this.services = {};
        this.components = {};
        
        // Application lifecycle state
        this.initialized = false;
        this.destroyed = false;
        
        // Initialize the application
        this.init();
    }

    async init() {
        try {
            console.log('ðŸŽ¨ Setting up theme toggle...');
            this.initializeTheme();
            
            console.log('ðŸ”§ Setting up core services...');
            await this.initializeServices();
            
            console.log('ðŸ”— Setting up state synchronization...');
            await this.setupStateSynchronization();
            
            console.log('ðŸ” Checking authentication...');
            await this.handleAuthentication();
            
            console.log('ðŸ“¡ Setting up event handlers...');
            this.setupEventHandlers();
            
            console.log('âš¡ Setting up performance monitoring...');
            this.setupPerformanceMonitoring();
            
            this.initialized = true;
            console.log('âœ… Lupo Trading Platform initialized successfully');
            
        } catch (error) {
            console.error('âŒ Failed to initialize application:', error);
            this.handleInitializationError(error);
        }
    }

    /**
     * Theme initialization
     */
    initializeTheme() {
        // Initialize ThemeToggle from app.js
        if (typeof ThemeToggle !== 'undefined') {
            this.themeToggle = new ThemeToggle();
        }
    }

    /**
     * Service initialization with state integration
     */
    async initializeServices() {
        // Initialize core services (these are already global instances)
        this.services = {
            config: window.lupoConfig,
            storage: window.lupoStorage,
            validation: window.ValidationUtils,
            apiClient: window.lupoApiClient,
            notifications: window.lupoNotifications,
            auth: window.lupoAuth,
            stocks: window.lupoStocks,
            portfolio: window.lupoPortfolio,
            realTime: window.lupoRealTime
        };

        // Register all services with state synchronization
        Object.entries(this.services).forEach(([name, service]) => {
            if (service && this.stateSync) {
                this.stateSync.registerService(name, service);
            }
        });

        console.log('ðŸ“‹ Registered services:', Object.keys(this.services));
    }

    /**
     * Component initialization with dependency injection
     */
    async initializeComponents() {
        // Wait for all global services to be available
        await this.waitForServices();
        
        // Components now use global services by default via dependency injection
        this.components = {
            tradeModal: new TradeModal(),
            passwordReset: new PasswordReset(), 
            userProfile: new UserProfile(),
            portfolioDashboard: new PortfolioDashboard(),
            realTimePrices: new RealTimePrices(),
            technicalChart: new TechnicalChart()
        };

        // Setup component communication through state
        this.setupComponentCommunication();
        
        console.log('ðŸŽ¨ Initialized components:', Object.keys(this.components));
    }

    /**
     * Wait for all required global services to be available
     */
    async waitForServices() {
        const requiredServices = [
            'lupoConfig', 'lupoStorage', 'lupoApiClient', 'lupoNotifications',
            'lupoAuth', 'lupoStocks', 'lupoPortfolio', 'lupoRealTime'
        ];
        
        const maxWait = 5000; // 5 seconds
        const checkInterval = 100; // 100ms
        let waited = 0;
        
        while (waited < maxWait) {
            const missingServices = requiredServices.filter(service => !window[service]);
            
            if (missingServices.length === 0) {
                console.log('âœ… All services are available');
                return;
            }
            
            console.log('â³ Waiting for services:', missingServices);
            await new Promise(resolve => setTimeout(resolve, checkInterval));
            waited += checkInterval;
        }
        
        console.warn('âš ï¸ Some services may not be ready:', 
            requiredServices.filter(service => !window[service]));
    }

    /**
     * State synchronization setup
     */
    async setupStateSynchronization() {
        // Subscribe to state changes for UI updates
        this.appState.subscribe('app-manager', (prevState, newState, action) => {
            this.handleStateChange(prevState, newState, action);
        });

        // Force initial sync of all services
        await this.stateSync.forceSyncAll();
    }

    /**
     * Authentication handling with state integration
     */
    async handleAuthentication() {
        const authState = this.appState.getAuthState();
        
        if (!authState.isAuthenticated) {
            console.log('âŒ Not authenticated - showing login form');
            this.showLoginForm();
            return;
        }

        console.log('âœ… User is authenticated - verifying token...');
        
        // Verify token through auth service
        const isValid = await this.services.auth.verifyToken();
        
        if (!isValid) {
            console.log('âŒ Token invalid - showing login form');
            this.appState.clearAuthenticationState();
            this.showLoginForm();
            return;
        }

        console.log('âœ… Authentication verified - initializing authenticated app');
        await this.initializeAuthenticatedApp();
    }

    showLoginForm() {
        // Update UI state
        this.appState.setState({
            ui: {
                ...this.appState.getUIState(),
                currentModal: 'login',
                loading: { ...this.appState.getUIState().loading, auth: false }
            }
        });

        // Show/hide DOM elements
        const loginPage = document.getElementById('login-page');
        const mainApp = document.getElementById('main-app');
        
        if (loginPage) loginPage.classList.remove('hidden');
        if (mainApp) mainApp.classList.add('hidden');
    }

    async initializeAuthenticatedApp() {
        console.log('ðŸ”“ Initializing authenticated application...');
        
        // Update UI state
        this.appState.setState({
            ui: {
                ...this.appState.getUIState(),
                currentModal: null,
                loading: { ...this.appState.getUIState().loading, auth: false }
            }
        });

        // Show main app
        const loginPage = document.getElementById('login-page');
        const mainApp = document.getElementById('main-app');
        
        if (loginPage) loginPage.classList.add('hidden');
        if (mainApp) mainApp.classList.remove('hidden');

        // Load initial data
        await this.loadInitialData();

        // Setup periodic updates
        this.setupPeriodicUpdates();
        
        // Start real-time tracking
        this.startRealTimeTracking();

        console.log('âœ… Authenticated application initialized');
    }

    /**
     * Data loading with state updates
     */
    async loadInitialData() {
        console.log('ðŸ“Š Loading initial application data...');
        
        try {
            // Set loading states
            this.appState.setLoadingState('portfolio', true);
            this.appState.setLoadingState('market', true);

            // Load portfolio data
            if (this.services.portfolio) {
                try {
                    const portfolio = await this.services.portfolio.getPortfolio();
                    this.appState.updatePortfolio(portfolio);
                } catch (error) {
                    console.error('Failed to load portfolio:', error);
                }
            }

            // Load market opportunities
            if (this.services.stocks) {
                try {
                    const opportunities = await this.services.stocks.getOpportunities();
                    this.appState.setState({
                        market: {
                            ...this.appState.getMarketState(),
                            opportunities,
                            lastDataUpdate: Date.now()
                        }
                    });
                } catch (error) {
                    console.error('Failed to load market data:', error);
                }
            }

        } catch (error) {
            console.error('âŒ Error loading initial data:', error);
            this.services.notifications.error('Loading Error', 'Failed to load application data');
        } finally {
            // Clear loading states
            this.appState.setLoadingState('portfolio', false);
            this.appState.setLoadingState('market', false);
        }
    }

    /**
     * Event handling with state integration
     */
    setupEventHandlers() {
        // Login form handling
        this.setupLoginFormHandlers();
        
        // Navigation handling
        this.setupNavigationHandlers();
        
        // Trading action handlers
        this.setupTradingHandlers();
        
        // Real-time event handlers
        this.setupRealTimeHandlers();
        
        // Global error handling
        this.setupErrorHandlers();
    }

    setupLoginFormHandlers() {
        console.log('ðŸ”§ Setting up login form handlers...');
        const loginForm = document.getElementById('login-form');
        console.log('ðŸ“‹ Login form found:', !!loginForm);
        
        if (loginForm) {
            console.log('âœ… Adding submit event listener to login form');
            loginForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                console.log('ðŸ”¥ Form submit event triggered!');
                await this.handleLogin(e);
            });
        } else {
            console.error('âŒ Login form not found! Available forms:', document.querySelectorAll('form'));
        }

        const registerForm = document.getElementById('register-form');
        if (registerForm) {
            registerForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.handleRegister(e);
            });
        }
    }

    async handleLogin(e) {
        console.log('ðŸ” Login form submitted', e);
        
        const formData = new FormData(e.target);
        const email = formData.get('email');
        const password = formData.get('password');
        const rememberMe = formData.get('remember-me');

        console.log('ðŸ“§ Login data:', { email, password: '***', rememberMe });

        this.appState.setLoadingState('auth', true);

        try {
            console.log('ðŸš€ Calling auth service login...');
            const result = await this.services.auth.login(email, password, rememberMe);
            console.log('âœ… Login successful:', result);
            
            // Check if token was stored properly
            const storedToken = this.services.auth.getAuthToken();
            console.log('ðŸ”‘ Stored token:', storedToken ? 'Present' : 'Missing');
            
            // Check if API client has the token
            const apiToken = this.services.apiClient.getAuthToken();
            console.log('ðŸŒ API client token:', apiToken ? 'Present' : 'Missing');
            
            // State will be updated through auth service events
            await this.initializeAuthenticatedApp();
            
        } catch (error) {
            console.error('âŒ Login failed:', error);
            this.services.notifications?.error('Login Failed', error.message);
        } finally {
            this.appState.setLoadingState('auth', false);
        }
    }

    setupNavigationHandlers() {
        // Tab navigation with state updates
        document.addEventListener('click', (e) => {
            if (e.target.matches('[data-tab]')) {
                const tabId = e.target.dataset.tab;
                this.appState.setActiveTab(tabId);
                this.updateActiveTab(tabId);
            }
        });
    }

    updateActiveTab(tabId) {
        // Update UI to reflect active tab
        document.querySelectorAll('[data-tab]').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabId);
        });

        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.toggle('active', content.id === tabId);
        });
    }

    setupTradingHandlers() {
        // Trading button handlers
        document.addEventListener('click', (e) => {
            if (e.target.matches('[data-action="buy"]') || e.target.closest('[data-action="buy"]')) {
                const button = e.target.matches('[data-action="buy"]') ? e.target : e.target.closest('[data-action="buy"]');
                const symbol = button.dataset.symbol;
                const price = parseFloat(button.dataset.price);
                
                this.handleTradeAction('buy', { symbol, price });
            }
            
            if (e.target.matches('[data-action="sell"]') || e.target.closest('[data-action="sell"]')) {
                const button = e.target.matches('[data-action="sell"]') ? e.target : e.target.closest('[data-action="sell"]');
                const symbol = button.dataset.symbol;
                const price = parseFloat(button.dataset.price);
                
                this.handleTradeAction('sell', { symbol, price });
            }
        });
    }

    handleTradeAction(action, stock) {
        // Update UI state
        this.appState.setCurrentModal('trade-modal');
        
        // Dispatch event for trade modal
        const event = new CustomEvent('openTradeModal', {
            detail: { type: action, stock }
        });
        window.dispatchEvent(event);
    }

    setupRealTimeHandlers() {
        // Handle real-time price updates
        window.addEventListener('realtime:price-update', (e) => {
            // State is updated through StateSyncService
            this.updatePriceDisplays(e.detail);
        });

        // Handle connection state changes
        window.addEventListener('realtime:connection-change', (e) => {
            this.updateConnectionStatus(e.detail.state);
        });
    }

    updatePriceDisplays(priceData) {
        // Update price displays in UI
        const { symbol, price, change, changePercent } = priceData;
        
        document.querySelectorAll(`[data-symbol="${symbol}"]`).forEach(element => {
            const priceElement = element.querySelector('.stock-price');
            if (priceElement) {
                priceElement.textContent = `$${price.toFixed(2)}`;
            }
            
            const changeElement = element.querySelector('.price-change');
            if (changeElement) {
                const changeClass = change >= 0 ? 'positive' : 'negative';
                const changePrefix = change >= 0 ? '+' : '';
                changeElement.className = `price-change ${changeClass}`;
                changeElement.textContent = `${changePrefix}${change.toFixed(2)} (${changePercent.toFixed(2)}%)`;
            }
        });
    }

    updateConnectionStatus(connectionState) {
        const statusIndicator = document.getElementById('connection-status');
        if (statusIndicator) {
            statusIndicator.className = `connection-status ${connectionState}`;
            statusIndicator.textContent = connectionState.toUpperCase();
        }
    }

    /**
     * State change handling
     */
    handleStateChange(prevState, newState, action) {
        // Handle specific state changes that require UI updates
        switch (action.action) {
            case 'AUTH_LOGIN':
                this.handleAuthStateChange(newState.auth);
                break;
            case 'AUTH_LOGOUT':
                this.handleLogout();
                break;
            case 'UI_TAB_CHANGE':
                this.updateActiveTab(newState.ui.activeTab);
                break;
            case 'PORTFOLIO_UPDATE':
                this.updatePortfolioDisplays(newState.portfolio);
                break;
            case 'PRICE_UPDATE':
                // Handled by real-time price component
                break;
        }
    }

    handleAuthStateChange(authState) {
        if (authState.isAuthenticated) {
            this.updateUserDisplay(authState.user);
        }
    }

    handleLogout() {
        // Clean up authenticated state
        Object.values(this.components).forEach(component => {
            if (component.destroy) {
                component.destroy();
            }
        });
        
        // Show login form
        this.showLoginForm();
    }

    updateUserDisplay(user) {
        const userNameElements = document.querySelectorAll('.user-name');
        userNameElements.forEach(element => {
            element.textContent = user.firstName || user.email || 'User';
        });
    }

    updatePortfolioDisplays(portfolioState) {
        // Update portfolio summary displays
        const summaryElements = {
            'portfolio-value': portfolioState.totalValue,
            'cash-balance': portfolioState.cashBalance,
            'total-positions': portfolioState.holdings.length
        };

        Object.entries(summaryElements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                if (typeof value === 'number') {
                    element.textContent = `$${value.toLocaleString()}`;
                } else {
                    element.textContent = value;
                }
            }
        });
    }

    /**
     * Performance monitoring
     */
    setupPerformanceMonitoring() {
        // Monitor state update performance
        let updateCount = 0;
        const startTime = Date.now();
        
        this.appState.subscribe('performance-monitor', (prevState, newState, action) => {
            updateCount++;
            
            if (updateCount % 100 === 0) {
                const avgTime = (Date.now() - startTime) / updateCount;
                console.log(`ðŸ“Š State Performance: ${updateCount} updates, avg ${avgTime.toFixed(2)}ms`);
            }
        });

        // Monitor memory usage periodically
        if (window.performance && window.performance.memory) {
            setInterval(() => {
                const memory = window.performance.memory;
                if (memory.usedJSHeapSize > 50 * 1024 * 1024) { // 50MB
                    console.warn('âš ï¸ High memory usage detected:', {
                        used: Math.round(memory.usedJSHeapSize / 1024 / 1024) + 'MB',
                        total: Math.round(memory.totalJSHeapSize / 1024 / 1024) + 'MB'
                    });
                }
            }, 30000);
        }
    }

    /**
     * Periodic updates
     */
    setupPeriodicUpdates() {
        const settings = this.appState.getSettingsState();
        
        if (settings.autoRefresh) {
            setInterval(() => {
                this.performPeriodicUpdates();
            }, settings.refreshInterval);
        }
    }

    async performPeriodicUpdates() {
        const authState = this.appState.getAuthState();
        if (!authState.isAuthenticated) return;

        try {
            // Refresh portfolio data
            if (this.services.portfolio) {
                const portfolio = await this.services.portfolio.getPortfolio();
                this.appState.updatePortfolio(portfolio);
            }
        } catch (error) {
            console.error('Periodic update failed:', error);
        }
    }

    startRealTimeTracking() {
        const portfolioState = this.appState.getPortfolioState();
        const marketState = this.appState.getMarketState();
        
        // Start tracking portfolio symbols
        if (portfolioState.holdings.length > 0) {
            const symbols = portfolioState.holdings.map(h => h.symbol);
            this.services.realTime?.watchSymbols(symbols);
        }
        
        // Start tracking watchlist symbols
        if (marketState.watchlist.length > 0) {
            this.services.realTime?.watchSymbols(marketState.watchlist);
        }
    }

    /**
     * Component communication
     */
    setupComponentCommunication() {
        // Components can communicate through state changes and events
        // This is handled by the StateSyncService
    }

    /**
     * Error handling
     */
    setupErrorHandlers() {
        window.addEventListener('error', (e) => {
            console.error('Global error:', e.error);
            this.handleGlobalError(e.error);
        });

        window.addEventListener('unhandledrejection', (e) => {
            console.error('Unhandled promise rejection:', e.reason);
            this.handleGlobalError(e.reason);
        });
    }

    handleGlobalError(error) {
        // Update system state with error
        this.appState.setState({
            system: {
                ...this.appState.getState().system,
                lastError: {
                    message: error.message,
                    stack: error.stack,
                    timestamp: Date.now()
                },
                performanceMetrics: {
                    ...this.appState.getState().system.performanceMetrics,
                    errors: this.appState.getState().system.performanceMetrics.errors + 1
                }
            }
        });

        // Show error notification
        this.services.notifications?.error('Application Error', 'An unexpected error occurred');
    }

    handleInitializationError(error) {
        console.error('Initialization failed:', error);
        
        // Show fallback UI
        document.body.innerHTML = `
            <div class="error-screen">
                <h1>Application Error</h1>
                <p>Failed to initialize the trading platform.</p>
                <button onclick="location.reload()">Reload</button>
            </div>
        `;
    }

    /**
     * Application lifecycle
     */
    async restart() {
        console.log('ðŸ”„ Restarting application...');
        
        await this.destroy();
        await this.init();
    }

    async destroy() {
        if (this.destroyed) return;
        
        console.log('ðŸ—‘ï¸ Destroying application...');
        
        // Destroy components
        Object.values(this.components).forEach(component => {
            if (component.destroy) {
                component.destroy();
            }
        });

        // Destroy services
        if (this.stateSync) {
            this.stateSync.destroy();
        }

        if (this.appState) {
            this.appState.destroy();
        }

        this.destroyed = true;
        console.log('âœ… Application destroyed');
    }

    /**
     * Debug and monitoring API
     */
    getApplicationState() {
        return this.appState.getState();
    }

    getServiceStats() {
        const stats = {};
        Object.entries(this.services).forEach(([name, service]) => {
            if (service.getStats) {
                stats[name] = service.getStats();
            }
        });
        return stats;
    }

    getComponentStats() {
        const stats = {};
        Object.entries(this.components).forEach(([name, component]) => {
            if (component.getStats) {
                stats[name] = component.getStats();
            }
        });
        return stats;
    }

    enableDebugMode() {
        this.appState.enableDebugMode();
        console.log('ðŸ› Debug mode enabled');
    }
}

// Initialize application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Create global application instance
    window.lupoApp = new AppManager();
});

// Export for use
window.AppManager = AppManager;

