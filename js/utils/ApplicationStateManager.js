/**
 * Application State Manager
 * Centralized state management for the entire Lupo Trading Platform
 * Provides reactive state updates, persistence, and cross-component communication
 */
class ApplicationStateManager extends StateManager {
    constructor(
        storage = window.lupoStorage,
        config = window.lupoConfig,
        validationUtils = window.ValidationUtils
    ) {
        // Initialize base StateManager with application-specific initial state
        super(ApplicationStateManager.getInitialState(), {
            persist: true,
            storageKey: 'lupo-app-state',
            middleware: [
                ApplicationStateManager.validationMiddleware,
                ApplicationStateManager.persistenceMiddleware,
                ApplicationStateManager.auditMiddleware
            ]
        });

        this.storage = storage;
        this.config = config;
        this.validationUtils = validationUtils;
        
        // State update batching for performance
        this.batchedUpdates = [];
        this.batchTimeout = null;
        this.batchDelay = this.config.get('state.batchDelay', 50);
        
        // Cross-component event system
        this.eventHandlers = new Map();
        
        // State persistence settings
        this.persistenceConfig = {
            user: { persist: true, encrypt: false },
            portfolio: { persist: true, encrypt: false },
            watchlist: { persist: true, encrypt: false },
            settings: { persist: true, encrypt: false },
            marketData: { persist: false, encrypt: false },
            realTimeData: { persist: false, encrypt: false },
            ui: { persist: true, encrypt: false }
        };
        
        this.init();
    }

    init() {
        console.log('🏛️ Initializing Application State Manager...');
        
        // Load persisted state
        this.loadPersistedState();
        
        // Setup state validation rules
        this.setupValidationRules();
        
        // Setup automatic cleanup
        this.setupStateCleanup();
        
        // Subscribe to auth events
        this.setupAuthEventHandlers();
        
        console.log('✅ Application State Manager initialized');
    }

    /**
     * Get initial application state structure
     */
    static getInitialState() {
        return {
            // Authentication state
            auth: {
                isAuthenticated: false,
                user: null,
                token: null,
                permissions: [],
                lastLogin: null
            },
            
            // Portfolio and trading data
            portfolio: {
                data: null,
                holdings: [],
                cashBalance: 0,
                totalValue: 0,
                metrics: null,
                lastUpdated: null
            },
            
            // Watchlist and market data
            market: {
                watchlist: [],
                opportunities: {
                    under1: [],
                    under4: [],
                    under5: []
                },
                currentPrices: new Map(),
                marketStatus: 'unknown',
                lastDataUpdate: null
            },
            
            // Real-time data
            realTime: {
                connected: false,
                subscriptions: new Set(),
                priceUpdates: new Map(),
                connectionState: 'disconnected',
                lastHeartbeat: null
            },
            
            // UI state
            ui: {
                activeTab: 'market-intelligence',
                currentModal: null,
                theme: 'dark',
                sidebarCollapsed: false,
                notifications: [],
                loading: {
                    portfolio: false,
                    market: false,
                    auth: false
                }
            },
            
            // Application settings
            settings: {
                autoRefresh: true,
                refreshInterval: 30000,
                soundEnabled: true,
                animationsEnabled: true,
                performanceMode: false,
                chartSettings: {
                    defaultTimeframe: '1D',
                    indicators: ['sma'],
                    theme: 'dark'
                }
            },
            
            // Trading state
            trading: {
                activeOrders: [],
                recentTrades: [],
                tradingEnabled: true,
                paperTrading: true,
                riskLimits: {
                    maxPositionSize: 100000,
                    maxDailyLoss: 5000
                }
            },
            
            // System state
            system: {
                online: navigator.onLine,
                performanceMetrics: {
                    stateUpdates: 0,
                    apiCalls: 0,
                    cacheHits: 0,
                    errors: 0
                },
                lastError: null,
                debugMode: false
            }
        };
    }

    /**
     * Authentication state management
     */
    setAuthenticationState(authData) {
        this.setState({
            auth: {
                isAuthenticated: !!authData.token,
                user: authData.user,
                token: authData.token,
                permissions: authData.permissions || [],
                lastLogin: Date.now()
            }
        }, { 
            action: 'AUTH_LOGIN',
            persist: true 
        });
    }

    clearAuthenticationState() {
        this.setState({
            auth: ApplicationStateManager.getInitialState().auth,
            portfolio: ApplicationStateManager.getInitialState().portfolio,
            trading: ApplicationStateManager.getInitialState().trading
        }, { 
            action: 'AUTH_LOGOUT',
            persist: true 
        });
    }

    /**
     * Portfolio state management
     */
    updatePortfolio(portfolioData) {
        const currentState = this.getState();
        
        this.setState({
            portfolio: {
                ...currentState.portfolio,
                data: portfolioData,
                holdings: portfolioData.holdings || [],
                cashBalance: portfolioData.cash_balance || 0,
                totalValue: portfolioData.total_value || 0,
                metrics: portfolioData.metrics,
                lastUpdated: Date.now()
            }
        }, { 
            action: 'PORTFOLIO_UPDATE',
            persist: true 
        });
    }

    addToWatchlist(symbol) {
        const currentState = this.getState();
        const watchlist = [...currentState.market.watchlist];
        
        if (!watchlist.includes(symbol.toUpperCase())) {
            watchlist.push(symbol.toUpperCase());
            
            this.setState({
                market: {
                    ...currentState.market,
                    watchlist
                }
            }, { 
                action: 'WATCHLIST_ADD',
                data: { symbol },
                persist: true 
            });
        }
    }

    removeFromWatchlist(symbol) {
        const currentState = this.getState();
        const watchlist = currentState.market.watchlist.filter(s => s !== symbol.toUpperCase());
        
        this.setState({
            market: {
                ...currentState.market,
                watchlist
            }
        }, { 
            action: 'WATCHLIST_REMOVE',
            data: { symbol },
            persist: true 
        });
    }

    /**
     * Real-time data management
     */
    updateRealTimePrice(symbol, priceData) {
        const currentState = this.getState();
        const priceUpdates = new Map(currentState.realTime.priceUpdates);
        priceUpdates.set(symbol.toUpperCase(), {
            ...priceData,
            timestamp: Date.now()
        });

        this.setState({
            realTime: {
                ...currentState.realTime,
                priceUpdates
            }
        }, { 
            action: 'PRICE_UPDATE',
            data: { symbol, ...priceData },
            persist: false 
        });
    }

    setRealTimeConnectionState(connectionState) {
        const currentState = this.getState();
        
        this.setState({
            realTime: {
                ...currentState.realTime,
                connected: connectionState === 'connected',
                connectionState,
                lastHeartbeat: connectionState === 'connected' ? Date.now() : currentState.realTime.lastHeartbeat
            }
        }, { 
            action: 'REALTIME_CONNECTION',
            data: { connectionState },
            persist: false 
        });
    }

    /**
     * UI state management
     */
    setActiveTab(tabId) {
        this.setState({
            ui: {
                ...this.getState().ui,
                activeTab: tabId
            }
        }, { 
            action: 'UI_TAB_CHANGE',
            data: { tabId },
            persist: true 
        });
    }

    setCurrentModal(modalId) {
        this.setState({
            ui: {
                ...this.getState().ui,
                currentModal: modalId
            }
        }, { 
            action: 'UI_MODAL_CHANGE',
            data: { modalId },
            persist: false 
        });
    }

    setLoadingState(key, isLoading) {
        const currentState = this.getState();
        
        this.setState({
            ui: {
                ...currentState.ui,
                loading: {
                    ...currentState.ui.loading,
                    [key]: isLoading
                }
            }
        }, { 
            action: 'UI_LOADING',
            data: { key, isLoading },
            persist: false 
        });
    }

    /**
     * Settings management
     */
    updateSettings(settingsUpdate) {
        const currentState = this.getState();
        
        this.setState({
            settings: {
                ...currentState.settings,
                ...settingsUpdate
            }
        }, { 
            action: 'SETTINGS_UPDATE',
            data: settingsUpdate,
            persist: true 
        });
    }

    /**
     * Trading state management
     */
    addRecentTrade(tradeData) {
        const currentState = this.getState();
        const recentTrades = [tradeData, ...currentState.trading.recentTrades].slice(0, 50);
        
        this.setState({
            trading: {
                ...currentState.trading,
                recentTrades
            }
        }, { 
            action: 'TRADE_EXECUTED',
            data: tradeData,
            persist: true 
        });
    }

    /**
     * Batch state updates for performance
     */
    batchUpdate(updates) {
        this.batchedUpdates.push(...updates);
        
        if (this.batchTimeout) {
            clearTimeout(this.batchTimeout);
        }
        
        this.batchTimeout = setTimeout(() => {
            this.processBatchedUpdates();
        }, this.batchDelay);
    }

    processBatchedUpdates() {
        if (this.batchedUpdates.length === 0) return;
        
        const mergedUpdate = this.batchedUpdates.reduce((acc, update) => {
            return { ...acc, ...update };
        }, {});
        
        this.setState(mergedUpdate, { 
            action: 'BATCH_UPDATE',
            batchSize: this.batchedUpdates.length 
        });
        
        this.batchedUpdates = [];
        this.batchTimeout = null;
    }

    /**
     * State persistence management
     */
    loadPersistedState() {
        try {
            const persistedState = this.storage.get('lupo-app-state');
            if (persistedState) {
                // Merge with initial state to handle new fields
                const mergedState = this.deepMerge(ApplicationStateManager.getInitialState(), persistedState);
                this.replaceState(mergedState);
                console.log('📂 Loaded persisted application state');
            }
        } catch (error) {
            console.error('❌ Error loading persisted state:', error);
        }
    }

    persistState() {
        try {
            const currentState = this.getState();
            const stateToPersist = {};
            
            // Only persist configured state sections
            Object.entries(this.persistenceConfig).forEach(([key, config]) => {
                if (config.persist && currentState[key]) {
                    stateToPersist[key] = currentState[key];
                }
            });
            
            this.storage.set('lupo-app-state', stateToPersist, {
                compress: true,
                ttl: 7 * 24 * 60 * 60 * 1000 // 7 days
            });
        } catch (error) {
            console.error('❌ Error persisting state:', error);
        }
    }

    /**
     * State validation
     */
    setupValidationRules() {
        this.validationRules = {
            'auth.user.email': ['email'],
            'portfolio.totalValue': ['number', { rule: 'min', value: 0 }],
            'portfolio.cashBalance': ['number', { rule: 'min', value: 0 }],
            'settings.refreshInterval': ['number', { rule: 'min', value: 1000 }],
            'ui.activeTab': ['string'],
            'market.watchlist': ['array']
        };
    }

    /**
     * Middleware functions
     */
    static validationMiddleware(prevState, newState, action) {
        // Validate critical state changes
        if (action.action === 'AUTH_LOGIN' && !newState.auth.token) {
            throw new Error('Authentication requires a valid token');
        }
        
        if (action.action === 'PORTFOLIO_UPDATE' && newState.portfolio.totalValue < 0) {
            console.warn('⚠️ Portfolio total value is negative');
        }
        
        return newState;
    }

    static persistenceMiddleware(prevState, newState, action) {
        // Mark which actions should trigger persistence
        const persistActions = ['AUTH_LOGIN', 'AUTH_LOGOUT', 'PORTFOLIO_UPDATE', 'SETTINGS_UPDATE', 'WATCHLIST_ADD', 'WATCHLIST_REMOVE'];
        
        if (persistActions.includes(action.action)) {
            action.shouldPersist = true;
        }
        
        return newState;
    }

    static auditMiddleware(prevState, newState, action) {
        // Log important state changes for debugging
        const auditActions = ['AUTH_LOGIN', 'AUTH_LOGOUT', 'TRADE_EXECUTED'];
        
        if (auditActions.includes(action.action)) {
            console.log(`🔍 State Audit: ${action.action}`, {
                timestamp: Date.now(),
                action: action.action,
                data: action.data
            });
        }
        
        return newState;
    }

    /**
     * Event handling setup
     */
    setupAuthEventHandlers() {
        // Listen for auth events from AuthService
        window.addEventListener('auth:login', (e) => {
            this.setAuthenticationState(e.detail);
        });
        
        window.addEventListener('auth:logout', () => {
            this.clearAuthenticationState();
        });
        
        // Listen for portfolio events
        window.addEventListener('portfolio:updated', (e) => {
            this.updatePortfolio(e.detail.data);
        });
        
        // Listen for trade events
        window.addEventListener('trade:completed', (e) => {
            this.addRecentTrade(e.detail.data);
        });
    }

    /**
     * State cleanup for performance
     */
    setupStateCleanup() {
        // Clean up old real-time data every 5 minutes
        setInterval(() => {
            this.cleanupOldRealTimeData();
        }, 5 * 60 * 1000);
        
        // Clean up old notifications every hour
        setInterval(() => {
            this.cleanupOldNotifications();
        }, 60 * 60 * 1000);
    }

    cleanupOldRealTimeData() {
        const currentState = this.getState();
        const cutoffTime = Date.now() - (10 * 60 * 1000); // 10 minutes ago
        const priceUpdates = new Map();
        
        currentState.realTime.priceUpdates.forEach((data, symbol) => {
            if (data.timestamp > cutoffTime) {
                priceUpdates.set(symbol, data);
            }
        });
        
        if (priceUpdates.size < currentState.realTime.priceUpdates.size) {
            this.setState({
                realTime: {
                    ...currentState.realTime,
                    priceUpdates
                }
            }, { action: 'CLEANUP_REALTIME_DATA' });
        }
    }

    cleanupOldNotifications() {
        const currentState = this.getState();
        const cutoffTime = Date.now() - (24 * 60 * 60 * 1000); // 24 hours ago
        const notifications = currentState.ui.notifications.filter(n => n.timestamp > cutoffTime);
        
        if (notifications.length < currentState.ui.notifications.length) {
            this.setState({
                ui: {
                    ...currentState.ui,
                    notifications
                }
            }, { action: 'CLEANUP_NOTIFICATIONS' });
        }
    }

    /**
     * Utility methods
     */
    deepMerge(target, source) {
        const result = { ...target };
        
        Object.keys(source).forEach(key => {
            if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                result[key] = this.deepMerge(target[key] || {}, source[key]);
            } else {
                result[key] = source[key];
            }
        });
        
        return result;
    }

    /**
     * Get specific state slices for performance
     */
    getAuthState() {
        return this.getState().auth;
    }

    getPortfolioState() {
        return this.getState().portfolio;
    }

    getMarketState() {
        return this.getState().market;
    }

    getUIState() {
        return this.getState().ui;
    }

    getSettingsState() {
        return this.getState().settings;
    }

    /**
     * Debug and monitoring
     */
    getStateSize() {
        const state = this.getState();
        return JSON.stringify(state).length;
    }

    getPerformanceMetrics() {
        return this.getState().system.performanceMetrics;
    }

    enableDebugMode() {
        this.setState({
            system: {
                ...this.getState().system,
                debugMode: true
            }
        });
    }

    /**
     * Cleanup and destroy
     */
    destroy() {
        console.log('🏛️ Destroying Application State Manager...');
        
        // Persist final state
        this.persistState();
        
        // Clear timeouts
        if (this.batchTimeout) {
            clearTimeout(this.batchTimeout);
        }
        
        // Call parent destroy
        super.destroy();
    }
}

// Create global instance
const lupoAppState = new ApplicationStateManager();

// Export for use
window.ApplicationStateManager = ApplicationStateManager;
window.lupoAppState = lupoAppState;