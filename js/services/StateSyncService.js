/**
 * State Synchronization Service
 * Coordinates state updates between the centralized ApplicationStateManager and all services
 * Ensures data consistency and handles cross-service communication
 */
class StateSyncService {
    constructor(
        appState = window.lupoAppState,
        config = window.lupoConfig,
        notifications = window.lupoNotifications
    ) {
        this.appState = appState;
        this.config = config;
        this.notifications = notifications;
        
        this.services = new Map();
        this.syncQueue = [];
        this.processing = false;
        this.syncInterval = null;
        
        // Service registration and state mapping
        this.serviceMappings = {
            auth: {
                service: null,
                stateKey: 'auth',
                syncMethods: ['login', 'logout', 'verifyToken'],
                events: ['auth:login', 'auth:logout', 'auth:verified']
            },
            portfolio: {
                service: null,
                stateKey: 'portfolio',
                syncMethods: ['getPortfolio', 'executeTrade'],
                events: ['portfolio:updated', 'trade:executed']
            },
            stocks: {
                service: null,   
                stateKey: 'market',
                syncMethods: ['getStockQuote', 'getMultipleQuotes'],
                events: ['market:data-updated', 'watchlist:changed']
            },
            realTime: {
                service: null,
                stateKey: 'realTime',
                syncMethods: ['subscribe', 'unsubscribe'],
                events: ['realtime:connected', 'realtime:disconnected', 'price:updated']
            }
        };
        
        this.init();
    }

    init() {
        console.log('🔄 Initializing State Synchronization Service...');
        
        // Setup automatic service registration
        this.setupServiceRegistration();
        
        // Setup state change listeners
        this.setupStateListeners();
        
        // Setup periodic synchronization
        this.setupPeriodicSync();
        
        // Setup cross-service event handlers
        this.setupEventHandlers();
        
        console.log('✅ State Synchronization Service initialized');
    }

    /**
     * Service registration and management
     */
    registerService(name, service) {
        console.log(`📋 Registering service: ${name}`);
        
        this.services.set(name, service);
        
        if (this.serviceMappings[name]) {
            this.serviceMappings[name].service = service;
            this.setupServiceSync(name, service);
        }
        
        // Auto-sync service state to central state
        this.syncServiceToState(name, service);
    }

    setupServiceSync(name, service) {
        const mapping = this.serviceMappings[name];
        
        // Wrap service methods to trigger state updates
        mapping.syncMethods.forEach(methodName => {
            if (service[methodName]) {
                const originalMethod = service[methodName].bind(service);
                
                service[methodName] = async (...args) => {
                    const result = await originalMethod(...args);
                    
                    // Sync result to state
                    this.syncMethodResult(name, methodName, result, args);
                    
                    return result;
                };
            }
        });
    }

    async syncServiceToState(name, service) {
        try {
            switch (name) {
                case 'auth':
                    await this.syncAuthService(service);
                    break;
                case 'portfolio':
                    await this.syncPortfolioService(service);
                    break;
                case 'stocks':
                    await this.syncStockService(service);
                    break;
                case 'realTime':
                    await this.syncRealTimeService(service);
                    break;
            }
        } catch (error) {
            console.error(`❌ Error syncing ${name} service:`, error);
        }
    }

    async syncAuthService(service) {
        const isAuthenticated = service.isAuthenticated();
        const user = service.getUser();
        const token = service.getAuthToken();
        
        if (isAuthenticated) {
            this.appState.setAuthenticationState({
                user,
                token,
                permissions: user?.permissions || []
            });
        }
    }

    async syncPortfolioService(service) {
        try {
            const portfolio = await service.getPortfolio();
            this.appState.updatePortfolio(portfolio);
        } catch (error) {
            console.log('Portfolio not available for sync');
        }
    }

    async syncStockService(service) {
        // Sync watchlist if available
        const stats = service.getStats();
        if (stats.subscribedSymbols > 0) {
            // Update market state with current subscriptions
            const currentState = this.appState.getMarketState();
            if (currentState.watchlist.length === 0) {
                console.log('No watchlist to sync from stock service');
            }
        }
    }

    async syncRealTimeService(service) {
        const connectionState = service.getConnectionState();
        this.appState.setRealTimeConnectionState(connectionState.state);
    }

    /**
     * Service auto-registration
     */
    setupServiceRegistration() {
        // Watch for global service instances
        const checkServices = () => {
            const globalServices = {
                auth: window.lupoAuth,
                portfolio: window.lupoPortfolio,
                stocks: window.lupoStocks,
                realTime: window.lupoRealTime
            };
            
            Object.entries(globalServices).forEach(([name, service]) => {
                if (service && !this.services.has(name)) {
                    this.registerService(name, service);
                }
            });
        };
        
        // Check immediately and then periodically
        checkServices();
        setInterval(checkServices, 1000);
    }

    /**
     * State change listeners
     */
    setupStateListeners() {
        // Listen to state changes and sync to services
        this.appState.subscribe('state-sync', (prevState, newState, action) => {
            this.handleStateChange(prevState, newState, action);
        });
    }

    handleStateChange(prevState, newState, action) {
        // Queue state changes for processing
        this.syncQueue.push({
            prevState,
            newState,
            action,
            timestamp: Date.now()
        });
        
        // Process queue
        this.processSync();
    }

    async processSync() {
        if (this.processing || this.syncQueue.length === 0) return;
        
        this.processing = true;
        
        try {
            while (this.syncQueue.length > 0) {
                const syncItem = this.syncQueue.shift();
                await this.processSyncItem(syncItem);
            }
        } catch (error) {
            console.error('❌ Error processing state sync:', error);
        } finally {
            this.processing = false;
        }
    }

    async processSyncItem({ prevState, newState, action }) {
        switch (action.action) {
            case 'AUTH_LOGIN':
                await this.syncAuthLogin(newState.auth);
                break;
            case 'AUTH_LOGOUT':
                await this.syncAuthLogout();
                break;
            case 'PORTFOLIO_UPDATE':
                await this.syncPortfolioUpdate(newState.portfolio);
                break;
            case 'WATCHLIST_ADD':
                await this.syncWatchlistAdd(action.data.symbol);
                break;
            case 'WATCHLIST_REMOVE':
                await this.syncWatchlistRemove(action.data.symbol);
                break;
            case 'PRICE_UPDATE':
                await this.syncPriceUpdate(action.data);
                break;
            case 'SETTINGS_UPDATE':
                await this.syncSettingsUpdate(newState.settings);
                break;
        }
    }

    async syncAuthLogin(authState) {
        // Notify other services of authentication change
        const authService = this.services.get('auth');
        if (authService) {
            // Update API clients with new token
            const apiServices = ['portfolio', 'stocks'];
            apiServices.forEach(serviceName => {
                const service = this.services.get(serviceName);
                if (service && service.apiClient) {
                    service.apiClient.setAuthToken(authState.token);
                }
            });
        }
        
        // Trigger data refresh for authenticated services
        this.refreshAuthenticatedData();
    }

    async syncAuthLogout() {
        // Clear tokens from all services
        this.services.forEach((service, name) => {
            if (service.apiClient) {
                service.apiClient.removeAuthToken();
            }
        });
        
        // Clear sensitive data
        this.clearSensitiveData();
    }

    async syncPortfolioUpdate(portfolioState) {
        // Update real-time service with portfolio symbols
        const realTimeService = this.services.get('realTime');
        if (realTimeService && portfolioState.holdings.length > 0) {
            const symbols = portfolioState.holdings.map(h => h.symbol);
            realTimeService.watchSymbols(symbols);
        }
    }

    async syncWatchlistAdd(symbol) {
        // Add to real-time tracking
        const realTimeService = this.services.get('realTime');
        if (realTimeService) {
            realTimeService.watchSymbols([symbol]);
        }
    }

    async syncWatchlistRemove(symbol) {
        // Remove from real-time tracking if not in portfolio
        const portfolioState = this.appState.getPortfolioState();
        const isInPortfolio = portfolioState.holdings.some(h => h.symbol === symbol);
        
        if (!isInPortfolio) {
            const realTimeService = this.services.get('realTime');
            if (realTimeService) {
                realTimeService.unwatchSymbols([symbol]);
            }
        }
    }

    async syncPriceUpdate(priceData) {
        // Update portfolio with new prices if needed
        const portfolioService = this.services.get('portfolio');
        if (portfolioService) {
            // Portfolio service will handle real-time price updates internally
        }
    }

    async syncSettingsUpdate(settings) {
        // Update services with new settings
        if (settings.refreshInterval) {
            this.updateRefreshIntervals(settings.refreshInterval);
        }
        
        if (settings.performanceMode !== undefined) {
            this.updatePerformanceMode(settings.performanceMode);
        }
    }

    /**
     * Event handlers
     */
    setupEventHandlers() {
        // Auth events
        window.addEventListener('auth:login', (e) => {
            const { user, token } = e.detail;
            this.appState.setAuthenticationState({ user, token });
        });
        
        window.addEventListener('auth:logout', () => {
            this.appState.clearAuthenticationState();
        });
        
        // Portfolio events
        window.addEventListener('trade:completed', (e) => {
            this.appState.addRecentTrade(e.detail.data);
            this.refreshPortfolioData();
        });
        
        // Real-time events
        window.addEventListener('realtime:price-update', (e) => {
            const { symbol, price, change, changePercent } = e.detail;
            this.appState.updateRealTimePrice(symbol, { price, change, changePercent });
        });
        
        // Connection events
        window.addEventListener('realtime:connection-change', (e) => {
            this.appState.setRealTimeConnectionState(e.detail.state);
        });
    }

    /**
     * Periodic synchronization
     */
    setupPeriodicSync() {
        const syncInterval = this.config.get('state.syncInterval', 30000); // 30 seconds
        
        this.syncInterval = setInterval(() => {
            this.performPeriodicSync();
        }, syncInterval);
    }

    async performPeriodicSync() {
        try {
            // Sync critical data
            await this.syncPortfolioIfStale();
            await this.syncMarketDataIfStale();
            await this.cleanupStaleData();
        } catch (error) {
            console.error('❌ Error in periodic sync:', error);
        }
    }

    async syncPortfolioIfStale() {
        const portfolioState = this.appState.getPortfolioState();
        const isStale = !portfolioState.lastUpdated || 
                       (Date.now() - portfolioState.lastUpdated) > 60000; // 1 minute
        
        if (isStale) {
            const portfolioService = this.services.get('portfolio');
            if (portfolioService) {
                try {
                    const portfolio = await portfolioService.getPortfolio();
                    this.appState.updatePortfolio(portfolio);
                } catch (error) {
                    console.log('Portfolio sync skipped - not authenticated');
                }
            }
        }
    }

    async syncMarketDataIfStale() {
        const marketState = this.appState.getMarketState();
        const isStale = !marketState.lastDataUpdate || 
                       (Date.now() - marketState.lastDataUpdate) > 300000; // 5 minutes
        
        if (isStale && marketState.watchlist.length > 0) {
            const stockService = this.services.get('stocks');
            if (stockService) {
                try {
                    const quotes = await stockService.getMultipleQuotes(marketState.watchlist);
                    // Update market data in state
                    quotes.forEach(quote => {
                        this.appState.updateRealTimePrice(quote.symbol, {
                            price: quote.price,
                            change: quote.change,
                            changePercent: quote.changePercent
                        });
                    });
                } catch (error) {
                    console.error('Market data sync failed:', error);
                }
            }
        }
    }

    cleanupStaleData() {
        // Cleanup is handled by ApplicationStateManager
        console.log('🧹 Periodic cleanup completed');
    }

    /**
     * Utility methods
     */
    async refreshAuthenticatedData() {
        const authState = this.appState.getAuthState();
        if (!authState.isAuthenticated) return;
        
        // Refresh portfolio
        const portfolioService = this.services.get('portfolio');
        if (portfolioService) {
            try {
                const portfolio = await portfolioService.getPortfolio();
                this.appState.updatePortfolio(portfolio);
            } catch (error) {
                console.error('Portfolio refresh failed:', error);
            }
        }
    }

    clearSensitiveData() {
        // Clear any cached sensitive data from services
        this.services.forEach((service, name) => {
            if (service.clearCache) {
                service.clearCache();
            }
        });
    }

    updateRefreshIntervals(interval) {
        // Update refresh intervals for services that support it
        this.services.forEach((service, name) => {
            if (service.updateRefreshInterval) {
                service.updateRefreshInterval(interval);
            }
        });
    }

    updatePerformanceMode(enabled) {
        // Update performance mode for services
        this.services.forEach((service, name) => {
            if (service.setPerformanceMode) {
                service.setPerformanceMode(enabled);
            }
        });
    }

    /**
     * API for manual synchronization
     */
    async forceSyncAll() {
        console.log('🔄 Force syncing all services...');
        
        for (const [name, service] of this.services) {
            try {
                await this.syncServiceToState(name, service);
            } catch (error) {
                console.error(`Error syncing ${name}:`, error);
            }
        }
        
        console.log('✅ Force sync completed');
    }

    async forceSyncService(serviceName) {
        const service = this.services.get(serviceName);
        if (service) {
            await this.syncServiceToState(serviceName, service);
        }
    }

    /**
     * Debug and monitoring
     */
    getStats() {
        return {
            registeredServices: Array.from(this.services.keys()),
            syncQueueLength: this.syncQueue.length,
            processing: this.processing,
            lastSync: this.lastSyncTime
        };
    }

    getSyncHistory(limit = 10) {
        return this.syncHistory.slice(-limit);
    }

    /**
     * Cleanup
     */
    destroy() {
        console.log('🔄 Destroying State Synchronization Service...');
        
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
        }
        
        this.services.clear();
        this.syncQueue = [];
    }
}

// Create global instance
const lupoStateSync = new StateSyncService();

// Export for use
window.StateSyncService = StateSyncService;
window.lupoStateSync = lupoStateSync;