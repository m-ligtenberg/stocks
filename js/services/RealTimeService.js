/**
 * Real-Time Market Data Service
 * Handles live price updates, WebSocket connections, and market data streaming
 */
class RealTimeService {
    constructor(stockService, notificationService) {
        this.stockService = stockService;
        this.notificationService = notificationService;
        this.websocket = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000;
        this.updateInterval = null;
        this.subscribers = new Map();
        this.watchedSymbols = new Set();
        this.priceCache = new Map();
        this.isConnected = false;
        this.marketStatus = 'closed';
        
        this.init();
    }

    init() {
        console.log('🔴 Initializing Real-Time Market Data Service...');
        this.startPriceSimulation(); // Fallback to simulation since we don't have real WebSocket feed
        this.updateMarketStatus();
        this.setupMarketHours();
    }

    // Market status and hours management
    updateMarketStatus() {
        const now = new Date();
        const nyTime = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}));
        const hour = nyTime.getHours();
        const day = nyTime.getDay();
        
        // Market is open Monday-Friday, 9:30 AM - 4:00 PM EST
        const isWeekday = day >= 1 && day <= 5;
        const isMarketHours = hour >= 9.5 && hour < 16;
        
        this.marketStatus = isWeekday && isMarketHours ? 'open' : 'closed';
        
        // Broadcast market status change
        this.broadcast('marketStatus', {
            status: this.marketStatus,
            timestamp: Date.now()
        });
    }

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

    // Subscription management
    subscribe(subscriberId, callback, symbols = []) {
        console.log(`📊 Subscribing ${subscriberId} to real-time updates`);
        
        this.subscribers.set(subscriberId, {
            callback,
            symbols: new Set(symbols),
            lastUpdate: Date.now()
        });

        // Add symbols to watch list
        symbols.forEach(symbol => this.watchedSymbols.add(symbol.toUpperCase()));
        
        // Send initial data
        this.sendInitialData(subscriberId, symbols);
        
        return () => this.unsubscribe(subscriberId);
    }

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
        }
    }

    // Add symbols to watch
    watchSymbols(symbols) {
        symbols.forEach(symbol => {
            const upperSymbol = symbol.toUpperCase();
            this.watchedSymbols.add(upperSymbol);
            console.log(`👁️ Now watching ${upperSymbol} for price updates`);
        });
    }

    // Remove symbols from watch
    unwatchSymbols(symbols) {
        symbols.forEach(symbol => {
            const upperSymbol = symbol.toUpperCase();
            this.watchedSymbols.delete(upperSymbol);
            console.log(`👁️ Stopped watching ${upperSymbol}`);
        });
    }

    // Price simulation (fallback when no real WebSocket)
    startPriceSimulation() {
        console.log('📈 Starting price simulation for demo purposes...');
        
        // Update prices every 2-5 seconds for watched symbols
        this.updateInterval = setInterval(() => {
            if (this.watchedSymbols.size === 0) return;
            
            // Simulate price updates for random symbols
            const symbolsArray = Array.from(this.watchedSymbols);
            const symbolsToUpdate = symbolsArray.slice(0, Math.min(3, symbolsArray.length));
            
            symbolsToUpdate.forEach(symbol => {
                this.simulatePriceUpdate(symbol);
            });
            
        }, this.getRandomInterval(2000, 5000));
    }

    simulatePriceUpdate(symbol) {
        const cached = this.priceCache.get(symbol);
        let currentPrice = cached?.price || this.getBasePrice(symbol);
        
        // Simulate realistic price movement (±0.5% to ±2%)
        const changePercent = (Math.random() - 0.5) * 4; // -2% to +2%
        const newPrice = currentPrice * (1 + changePercent / 100);
        const change = newPrice - currentPrice;
        const changePercentActual = (change / currentPrice) * 100;
        
        const priceData = {
            symbol,
            price: Number(newPrice.toFixed(2)),
            change: Number(change.toFixed(2)),
            changePercent: Number(changePercentActual.toFixed(2)),
            volume: Math.floor(Math.random() * 1000000) + 50000,
            timestamp: Date.now(),
            marketStatus: this.marketStatus
        };
        
        // Cache the update
        this.priceCache.set(symbol, priceData);
        
        // Broadcast to subscribers
        this.broadcast('priceUpdate', priceData);
        
        console.log(`💰 ${symbol}: $${newPrice.toFixed(2)} (${change >= 0 ? '+' : ''}${change.toFixed(2)})`);
    }

    getBasePrice(symbol) {
        // Base prices for common symbols
        const basePrices = {
            'AAPL': 150.00,
            'GOOGL': 2800.00,
            'MSFT': 300.00,
            'TSLA': 250.00,
            'AMZN': 3200.00,
            'META': 200.00,
            'NVDA': 400.00,
            'NFLX': 450.00,
            'AMD': 80.00,
            'INTC': 35.00,
            'NOK': 4.50,
            'GME': 20.00,
            'AMC': 8.00,
            'BB': 6.00,
            'PLTR': 15.00
        };
        
        return basePrices[symbol] || (Math.random() * 100 + 10);
    }

    getRandomInterval(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    // WebSocket connection (for future real implementation)
    async connectWebSocket() {
        try {
            // This would connect to a real WebSocket feed like Finnhub, IEX, or Alpaca
            // For now, we're using simulation
            console.log('🔌 WebSocket connection would be established here');
            this.isConnected = true;
            this.reconnectAttempts = 0;
        } catch (error) {
            console.error('❌ WebSocket connection failed:', error);
            this.handleReconnect();
        }
    }

    handleReconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`🔄 Attempting reconnect ${this.reconnectAttempts}/${this.maxReconnectAttempts}...`);
            
            setTimeout(() => {
                this.connectWebSocket();
            }, this.reconnectDelay * this.reconnectAttempts);
        } else {
            console.log('❌ Max reconnection attempts reached, falling back to simulation');
            this.startPriceSimulation();
        }
    }

    // Broadcasting system
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

    // Send initial cached data to new subscribers
    async sendInitialData(subscriberId, symbols) {
        const subscriber = this.subscribers.get(subscriberId);
        if (!subscriber) return;
        
        for (const symbol of symbols) {
            const upperSymbol = symbol.toUpperCase();
            let priceData = this.priceCache.get(upperSymbol);
            
            if (!priceData) {
                // Fetch initial price if not cached
                try {
                    const stockData = await this.stockService.fetchStockQuote(upperSymbol);
                    priceData = {
                        symbol: upperSymbol,
                        price: stockData.price,
                        change: stockData.change,
                        changePercent: stockData.changePercent,
                        volume: stockData.volume,
                        timestamp: Date.now(),
                        marketStatus: this.marketStatus
                    };
                    this.priceCache.set(upperSymbol, priceData);
                } catch (error) {
                    console.error(`❌ Failed to fetch initial data for ${upperSymbol}:`, error);
                    continue;
                }
            }
            
            // Send initial data
            subscriber.callback('priceUpdate', priceData);
        }
    }

    // Get current price for a symbol
    getCurrentPrice(symbol) {
        return this.priceCache.get(symbol.toUpperCase());
    }

    // Get all current prices
    getAllPrices() {
        return Object.fromEntries(this.priceCache);
    }

    // Market status getter
    getMarketStatus() {
        return {
            status: this.marketStatus,
            isOpen: this.marketStatus === 'open',
            watchedSymbols: Array.from(this.watchedSymbols),
            subscriberCount: this.subscribers.size
        };
    }

    // Performance monitoring
    getPerformanceStats() {
        return {
            subscriberCount: this.subscribers.size,
            watchedSymbols: this.watchedSymbols.size,
            cachedPrices: this.priceCache.size,
            isConnected: this.isConnected,
            marketStatus: this.marketStatus,
            lastUpdate: Math.max(...Array.from(this.subscribers.values()).map(s => s.lastUpdate))
        };
    }

    // Cleanup
    destroy() {
        console.log('🔴 Shutting down Real-Time Service...');
        
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
        
        if (this.websocket) {
            this.websocket.close();
        }
        
        this.subscribers.clear();
        this.watchedSymbols.clear();
        this.priceCache.clear();
    }
}