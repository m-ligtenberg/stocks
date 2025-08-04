/**
 * Real-Time Market Data Service
 * Handles WebSocket connections, real-time price updates, and market data streaming
 */
class RealTimeService {
    constructor(config = window.lupoConfig, stockService = window.lupoStocks, notificationService = window.lupoNotifications) {
        this.config = config;
        this.stockService = stockService;
        this.notificationService = notificationService;
        
        this.websocketUrl = this.config.get('websocket.url');
        this.reconnectAttempts = this.config.get('websocket.reconnectAttempts', 5);
        this.reconnectDelay = this.config.get('websocket.reconnectDelay', 2000);
        this.heartbeatInterval = this.config.get('websocket.heartbeatInterval', 30000);
        this.maxMessageSize = this.config.get('websocket.maxMessageSize', 1024 * 1024);
        
        this.websocket = null;
        this.currentReconnectAttempts = 0;
        this.updateInterval = null;
        this.heartbeatTimer = null;
        this.subscribers = new Map();
        this.watchedSymbols = new Set();
        this.priceCache = new Map();
        this.connectionState = 'disconnected';
        this.marketStatus = 'unknown';
        this.lastHeartbeat = null;
        
        this.init();
    }

    /**
     * Initialize real-time service
     */
    init() {
        console.log('🔴 Initializing Real-Time Market Data Service...');
        
        this.updateMarketStatus();
        this.setupMarketHours();
        
        // Try WebSocket connection first, fallback to simulation
        if (this.websocketUrl) {
            this.connectWebSocket();
        } else {
            console.log('🔄 No WebSocket URL configured, using price simulation');
            this.startPriceSimulation();
        }
    }

    /**
     * Update market status based on trading hours
     */
    updateMarketStatus() {
        const tradingHours = this.config.get('market.tradingHours');
        const isOpen = this.config.isMarketOpen();
        
        const previousStatus = this.marketStatus;
        this.marketStatus = isOpen ? 'open' : 'closed';
        
        if (previousStatus !== this.marketStatus) {
            this.broadcast('marketStatus', {
                status: this.marketStatus,
                isOpen,
                timestamp: Date.now(),
                tradingHours
            });
        }
    }

    /**
     * Setup market hours monitoring
     */
    setupMarketHours() {
        // Check market status every minute
        setInterval(() => {
            const prevStatus = this.marketStatus;
            this.updateMarketStatus();
            
            if (prevStatus !== this.marketStatus) {
                console.log(`📈 Market status changed: ${this.marketStatus}`);
                
                if (this.marketStatus === 'open') {
                    this.notificationService?.success('Market Open', 'Live trading is now active');
                } else {
                    this.notificationService?.info('Market Closed', 'After-hours trading only');
                }
            }
        }, 60000);
    }

    /**
     * WebSocket connection management
     */
    async connectWebSocket() {
        if (!this.websocketUrl) {
            console.log('🔄 No WebSocket URL configured, falling back to simulation');
            this.startPriceSimulation();
            return;
        }

        try {
            console.log(`🔌 Connecting to WebSocket: ${this.websocketUrl}`);
            this.connectionState = 'connecting';
            
            this.websocket = new WebSocket(this.websocketUrl);
            this.setupWebSocketEventHandlers();
            
        } catch (error) {
            console.error('❌ WebSocket connection failed:', error);
            this.handleConnectionError(error);
        }
    }

    /**
     * Setup WebSocket event handlers
     */
    setupWebSocketEventHandlers() {
        this.websocket.onopen = (event) => {
            console.log('✅ WebSocket connected successfully');
            this.connectionState = 'connected';
            this.currentReconnectAttempts = 0;
            
            // Start heartbeat
            this.startHeartbeat();
            
            // Subscribe to watched symbols
            this.subscribeToWatchedSymbols();
            
            this.broadcast('connectionState', { state: 'connected', timestamp: Date.now() });
        };

        this.websocket.onmessage = (event) => {
            try {
                if (event.data.length > this.maxMessageSize) {
                    console.warn('⚠️ Received message exceeds max size limit');
                    return;
                }

                const data = JSON.parse(event.data);
                this.handleWebSocketMessage(data);
            } catch (error) {
                console.error('❌ Error parsing WebSocket message:', error);
            }
        };

        this.websocket.onclose = (event) => {
            console.log(`🔌 WebSocket closed: ${event.code} - ${event.reason}`);
            this.connectionState = 'disconnected';
            this.stopHeartbeat();
            
            if (!event.wasClean) {
                this.handleReconnect();
            }
            
            this.broadcast('connectionState', { state: 'disconnected', timestamp: Date.now() });
        };

        this.websocket.onerror = (error) => {
            console.error('❌ WebSocket error:', error);
            this.handleConnectionError(error);
        };
    }

    /**
     * Handle WebSocket messages
     */
    handleWebSocketMessage(data) {
        switch (data.type) {
            case 'priceUpdate':
                this.handlePriceUpdate(data);
                break;
            case 'marketStatus':
                this.handleMarketStatusUpdate(data);
                break;
            case 'heartbeat':
                this.handleHeartbeat(data);
                break;
            case 'error':
                console.error('❌ WebSocket server error:', data.error);
                break;
            default:
                console.log('📨 Unknown message type:', data.type);
        }
    }

    /**
     * Handle price update from WebSocket
     */
    handlePriceUpdate(data) {
        const { symbol, price, change, changePercent, volume, timestamp } = data;
        
        const priceData = {
            symbol: symbol.toUpperCase(),
            price: Number(price),
            change: Number(change),
            changePercent: Number(changePercent),
            volume: Number(volume),
            timestamp: timestamp || Date.now(),
            marketStatus: this.marketStatus,
            source: 'websocket'
        };
        
        // Cache the update
        this.priceCache.set(symbol.toUpperCase(), priceData);
        
        // Broadcast to subscribers
        this.broadcast('priceUpdate', priceData);
        
        console.log(`💰 ${symbol}: $${price} (${change >= 0 ? '+' : ''}${change})`);
    }

    /**
     * Handle market status update
     */
    handleMarketStatusUpdate(data) {
        this.marketStatus = data.status;
        this.broadcast('marketStatus', data);
    }

    /**
     * Handle heartbeat response
     */
    handleHeartbeat(data) {
        this.lastHeartbeat = Date.now();
    }

    /**
     * Start heartbeat mechanism
     */
    startHeartbeat() {
        this.stopHeartbeat();
        
        this.heartbeatTimer = setInterval(() => {
            if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
                this.websocket.send(JSON.stringify({
                    type: 'heartbeat',
                    timestamp: Date.now()
                }));
            }
        }, this.heartbeatInterval);
    }

    /**
     * Stop heartbeat mechanism
     */
    stopHeartbeat() {
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
            this.heartbeatTimer = null;
        }
    }

    /**
     * Subscribe to watched symbols via WebSocket
     */
    subscribeToWatchedSymbols() {
        if (this.websocket && this.websocket.readyState === WebSocket.OPEN && this.watchedSymbols.size > 0) {
            const message = {
                type: 'subscribe',
                symbols: Array.from(this.watchedSymbols),
                timestamp: Date.now()
            };
            
            this.websocket.send(JSON.stringify(message));
            console.log(`📡 Subscribed to ${this.watchedSymbols.size} symbols via WebSocket`);
        }
    }

    /**
     * Handle connection errors and reconnection
     */
    handleConnectionError(error) {
        this.connectionState = 'error';
        console.error('❌ Connection error:', error);
        
        this.broadcast('connectionState', { 
            state: 'error', 
            error: error.message, 
            timestamp: Date.now() 
        });
        
        this.handleReconnect();
    }

    /**
     * Handle reconnection logic
     */
    handleReconnect() {
        if (this.currentReconnectAttempts >= this.reconnectAttempts) {
            console.log('❌ Max reconnection attempts reached, falling back to simulation');
            this.startPriceSimulation();
            return;
        }

        this.currentReconnectAttempts++;
        const delay = this.reconnectDelay * Math.pow(2, this.currentReconnectAttempts - 1);
        
        console.log(`🔄 Attempting reconnect ${this.currentReconnectAttempts}/${this.reconnectAttempts} in ${delay}ms...`);
        
        setTimeout(() => {
            this.connectWebSocket();
        }, delay);
    }

    /**
     * Start price simulation (fallback mode)
     */
    startPriceSimulation() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }

        console.log('📈 Starting price simulation for demo purposes...');
        this.connectionState = 'simulation';
        
        this.updateInterval = setInterval(() => {
            if (this.watchedSymbols.size === 0) return;
            
            // Simulate price updates for random subset of symbols
            const symbolsArray = Array.from(this.watchedSymbols);
            const updateCount = Math.min(3, symbolsArray.length);
            const symbolsToUpdate = this.shuffleArray(symbolsArray).slice(0, updateCount);
            
            symbolsToUpdate.forEach(symbol => {
                this.simulatePriceUpdate(symbol);
            });
            
        }, this.getRandomInterval(2000, 8000));
        
        this.broadcast('connectionState', { state: 'simulation', timestamp: Date.now() });
    }

    /**
     * Simulate price update for a symbol
     */
    simulatePriceUpdate(symbol) {
        const cached = this.priceCache.get(symbol);
        let currentPrice = cached?.price || this.getBasePrice(symbol);
        
        // More realistic price movement during market hours
        const isMarketOpen = this.marketStatus === 'open';
        const volatility = isMarketOpen ? 2.0 : 0.5; // Lower volatility when market is closed
        
        const changePercent = (Math.random() - 0.5) * volatility;
        const newPrice = currentPrice * (1 + changePercent / 100);
        const change = newPrice - currentPrice;
        const changePercentActual = (change / currentPrice) * 100;
        
        const priceData = {
            symbol: symbol.toUpperCase(),
            price: Number(newPrice.toFixed(2)),
            change: Number(change.toFixed(2)),
            changePercent: Number(changePercentActual.toFixed(2)),
            volume: Math.floor(Math.random() * 1000000) + 50000,
            timestamp: Date.now(),
            marketStatus: this.marketStatus,
            source: 'simulation'
        };
        
        // Cache the update
        this.priceCache.set(symbol.toUpperCase(), priceData);
        
        // Broadcast to subscribers
        this.broadcast('priceUpdate', priceData);
        
        // Show market alerts for significant changes
        if (Math.abs(changePercentActual) > 3) {
            this.notificationService?.showMarketAlert(symbol, newPrice, changePercentActual);
        }
    }

    /**
     * Get base price for a symbol
     */
    getBasePrice(symbol) {
        const basePrices = {
            'AAPL': 175.50, 'GOOGL': 2850.00, 'MSFT': 378.85, 'TSLA': 248.50,
            'AMZN': 3200.00, 'META': 200.00, 'NVDA': 875.28, 'NFLX': 450.00,
            'AMD': 80.00, 'INTC': 35.00, 'NOK': 3.92, 'GME': 20.00,
            'AMC': 4.25, 'BB': 6.00, 'PLTR': 15.00, 'HYSR': 0.42
        };
        
        return basePrices[symbol] || (Math.random() * 100 + 10);
    }

    /**
     * Subscription management
     */
    subscribe(subscriberId, callback, symbols = []) {
        console.log(`📊 Subscribing ${subscriberId} to real-time updates`);
        
        this.subscribers.set(subscriberId, {
            callback,
            symbols: new Set(symbols.map(s => s.toUpperCase())),
            lastUpdate: Date.now()
        });

        // Add symbols to watch list
        symbols.forEach(symbol => {
            this.watchedSymbols.add(symbol.toUpperCase());
        });
        
        // Update WebSocket subscription
        if (this.connectionState === 'connected') {
            this.subscribeToWatchedSymbols();
        }
        
        // Send initial data
        this.sendInitialData(subscriberId, symbols);
        
        return () => this.unsubscribe(subscriberId);
    }

    /**
     * Unsubscribe from updates
     */
    unsubscribe(subscriberId) {
        console.log(`📊 Unsubscribing ${subscriberId} from real-time updates`);
        
        const subscriber = this.subscribers.get(subscriberId);
        if (subscriber) {
            // Remove symbols that are no longer watched
            subscriber.symbols.forEach(symbol => {
                let stillWatched = false;
                for (const [id, sub] of this.subscribers) {
                    if (id !== subscriberId && sub.symbols.has(symbol)) {
                        stillWatched = true;
                        break;
                    }
                }
                if (!stillWatched) {
                    this.watchedSymbols.delete(symbol);
                }
            });
            
            this.subscribers.delete(subscriberId);
            
            // Update WebSocket subscription
            if (this.connectionState === 'connected') {
                this.subscribeToWatchedSymbols();
            }
        }
    }

    /**
     * Watch specific symbols
     */
    watchSymbols(symbols) {
        const added = [];
        symbols.forEach(symbol => {
            const upperSymbol = symbol.toUpperCase();
            if (!this.watchedSymbols.has(upperSymbol)) {
                this.watchedSymbols.add(upperSymbol);
                added.push(upperSymbol);
            }
        });
        
        if (added.length > 0) {
            console.log(`👁️ Now watching: ${added.join(', ')}`);
            
            if (this.connectionState === 'connected') {
                this.subscribeToWatchedSymbols();
            }
        }
    }

    /**
     * Unwatch specific symbols
     */
    unwatchSymbols(symbols) {
        const removed = [];
        symbols.forEach(symbol => {
            const upperSymbol = symbol.toUpperCase();
            if (this.watchedSymbols.has(upperSymbol)) {
                this.watchedSymbols.delete(upperSymbol);
                removed.push(upperSymbol);
            }
        });
        
        if (removed.length > 0) {
            console.log(`👁️ Stopped watching: ${removed.join(', ')}`);
        }
    }

    /**
     * Broadcast data to subscribers
     */
    broadcast(event, data) {
        this.subscribers.forEach((subscriber, id) => {
            try {
                // Filter data based on subscriber's symbol interests
                if (event === 'priceUpdate' && !subscriber.symbols.has(data.symbol)) {
                    return;
                }
                
                subscriber.callback(event, data);
                subscriber.lastUpdate = Date.now();
            } catch (error) {
                console.error(`❌ Error broadcasting to ${id}:`, error);
            }
        });
    }

    /**
     * Send initial data to new subscribers
     */
    async sendInitialData(subscriberId, symbols) {
        const subscriber = this.subscribers.get(subscriberId);
        if (!subscriber) return;
        
        for (const symbol of symbols) {
            const upperSymbol = symbol.toUpperCase();
            let priceData = this.priceCache.get(upperSymbol);
            
            if (!priceData) {
                try {
                    const stockData = await this.stockService.getStockQuote(upperSymbol);
                    priceData = {
                        symbol: upperSymbol,
                        price: stockData.price,
                        change: stockData.change,
                        changePercent: stockData.changePercent,
                        volume: stockData.volume,
                        timestamp: Date.now(),
                        marketStatus: this.marketStatus,
                        source: 'initial'
                    };
                    this.priceCache.set(upperSymbol, priceData);
                } catch (error) {
                    console.error(`❌ Failed to fetch initial data for ${upperSymbol}:`, error);
                    continue;
                }
            }
            
            subscriber.callback('priceUpdate', priceData);
        }
    }

    /**
     * Utility methods
     */
    shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    getRandomInterval(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    /**
     * Getters for current state
     */
    getCurrentPrice(symbol) {
        return this.priceCache.get(symbol.toUpperCase());
    }

    getAllPrices() {
        return Object.fromEntries(this.priceCache);
    }

    getConnectionState() {
        return {
            state: this.connectionState,
            isConnected: this.connectionState === 'connected',
            isSimulation: this.connectionState === 'simulation',
            lastHeartbeat: this.lastHeartbeat,
            reconnectAttempts: this.currentReconnectAttempts,
            maxReconnectAttempts: this.reconnectAttempts
        };
    }

    getMarketStatus() {
        return {
            status: this.marketStatus,
            isOpen: this.marketStatus === 'open',
            watchedSymbols: Array.from(this.watchedSymbols),
            subscriberCount: this.subscribers.size
        };
    }

    /**
     * Service statistics
     */
    getStats() {
        return {
            connectionState: this.connectionState,
            subscriberCount: this.subscribers.size,
            watchedSymbols: this.watchedSymbols.size,
            cachedPrices: this.priceCache.size,
            marketStatus: this.marketStatus,
            lastHeartbeat: this.lastHeartbeat,
            reconnectAttempts: this.currentReconnectAttempts,
            websocketUrl: this.websocketUrl
        };
    }

    /**
     * Cleanup and shutdown
     */
    destroy() {
        console.log('🔴 Shutting down Real-Time Service...');
        
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
        
        this.stopHeartbeat();
        
        if (this.websocket) {
            this.websocket.close(1000, 'Service shutdown');
            this.websocket = null;
        }
        
        this.subscribers.clear();
        this.watchedSymbols.clear();
        this.priceCache.clear();
        this.connectionState = 'disconnected';
    }
}

// Create global instance
const lupoRealTime = new RealTimeService();

// Export for use
window.RealTimeService = RealTimeService;
window.lupoRealTime = lupoRealTime;