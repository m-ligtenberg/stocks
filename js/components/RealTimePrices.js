/**
 * Real-Time Price Display Component
 * Handles live price updates in the UI with smooth animations
 */
class RealTimePrices {
    constructor(realTimeService, notificationService) {
        this.realTimeService = realTimeService;
        this.notificationService = notificationService;
        this.unsubscribe = null;
        this.priceElements = new Map();
        this.animationQueue = [];
        this.isAnimating = false;
        
        this.init();
    }

    init() {
        console.log('📊 Initializing Real-Time Price Display...');
        this.setupSubscription();
        this.setupMarketStatusIndicator();
        this.startAnimationLoop();
    }

    setupSubscription() {
        // Subscribe to real-time updates
        this.unsubscribe = this.realTimeService.subscribe(
            'price-display',
            (event, data) => this.handleRealTimeEvent(event, data),
            this.getWatchedSymbols()
        );
    }

    handleRealTimeEvent(event, data) {
        switch (event) {
            case 'priceUpdate':
                this.updatePriceDisplay(data);
                break;
            case 'marketStatus':
                this.updateMarketStatus(data);
                break;
            default:
                console.log(`📊 Received event: ${event}`, data);
        }
    }

    updatePriceDisplay(priceData) {
        const { symbol, price, change, changePercent, timestamp } = priceData;
        
        // Update stock cards
        this.updateStockCards(symbol, priceData);
        
        // Update portfolio holdings
        this.updatePortfolioHoldings(symbol, priceData);
        
        // Update modal if open
        this.updateStockModal(symbol, priceData);
        
        // Show price alert animation
        this.showPriceAlert(symbol, change);
    }

    updateStockCards(symbol, priceData) {
        // Find all stock cards with this symbol
        const stockCards = document.querySelectorAll(`[data-symbol="${symbol}"]`);
        
        stockCards.forEach(card => {
            this.updateCardPrice(card, priceData);
        });
    }

    updateCardPrice(card, priceData) {
        const { price, change, changePercent } = priceData;
        
        // Update price
        const priceElement = card.querySelector('.stock-price');
        if (priceElement) {
            this.animateValueChange(priceElement, `$${price.toFixed(2)}`);
        }
        
        // Update change
        const changeElement = card.querySelector('.price-change');
        if (changeElement) {
            const changeClass = change >= 0 ? 'positive' : 'negative';
            const changePrefix = change >= 0 ? '+' : '';
            const changeText = `${changePrefix}${change.toFixed(2)} (${changePercent.toFixed(2)}%)`;
            
            changeElement.className = `price-change ${changeClass}`;
            this.animateValueChange(changeElement, changeText);
        }
        
        // Add pulse animation to the entire card
        this.addPulseAnimation(card, change >= 0 ? 'positive' : 'negative');
    }

    updatePortfolioHoldings(symbol, priceData) {
        const holdingCard = document.querySelector(`.holding-card[data-symbol="${symbol}"]`);
        if (!holdingCard) return;
        
        const { price, change } = priceData;
        
        // Update current price
        const currentPriceElement = holdingCard.querySelector('.current-price');
        if (currentPriceElement) {
            this.animateValueChange(currentPriceElement, `$${price.toFixed(2)}`);
        }
        
        // Recalculate P&L (this would need holding data from portfolio service)
        this.recalculateHoldingMetrics(holdingCard, symbol, price);
        
        // Add pulse animation
        this.addPulseAnimation(holdingCard, change >= 0 ? 'positive' : 'negative');
    }

    recalculateHoldingMetrics(holdingCard, symbol, currentPrice) {
        // This would fetch holding data and recalculate metrics
        // For now, we'll animate the existing values
        const metricsElements = holdingCard.querySelectorAll('.metric-value');
        metricsElements.forEach(element => {
            this.addShimmerAnimation(element);
        });
    }

    updateStockModal(symbol, priceData) {
        const modal = document.getElementById('stock-modal');
        const modalTitle = document.getElementById('modal-title');
        
        if (!modal || modal.classList.contains('hidden')) return;
        if (!modalTitle || !modalTitle.textContent.includes(symbol)) return;
        
        // Update modal price data
        const analysisMetrics = document.getElementById('analysis-metrics');
        if (analysisMetrics) {
            this.updateModalMetrics(analysisMetrics, priceData);
        }
    }

    updateModalMetrics(container, priceData) {
        const { price, change, changePercent, volume } = priceData;
        
        // Find and update price metrics
        const metrics = container.querySelectorAll('.metric');
        metrics.forEach(metric => {
            const label = metric.querySelector('.metric-label')?.textContent;
            const valueElement = metric.querySelector('.metric-value');
            
            if (!valueElement) return;
            
            switch (label) {
                case 'Current Price':
                    this.animateValueChange(valueElement, `$${price.toFixed(2)}`);
                    break;
                case 'Price Change':
                    const changeClass = change >= 0 ? 'positive' : 'negative';
                    const changePrefix = change >= 0 ? '+' : '';
                    valueElement.className = `metric-value ${changeClass}`;
                    this.animateValueChange(valueElement, `${changePrefix}${change.toFixed(2)}`);
                    break;
                case 'Change %':
                    const percentClass = changePercent >= 0 ? 'positive' : 'negative';
                    valueElement.className = `metric-value ${percentClass}`;
                    this.animateValueChange(valueElement, `${changePercent.toFixed(2)}%`);
                    break;
                case 'Volume':
                    this.animateValueChange(valueElement, volume.toLocaleString());
                    break;
            }
        });
    }

    setupMarketStatusIndicator() {
        // Add market status indicator to header
        const headerStats = document.querySelector('.header-stats');
        if (!headerStats) return;
        
        const statusIndicator = document.createElement('div');
        statusIndicator.className = 'stat-item market-status';
        statusIndicator.id = 'market-status-indicator';
        statusIndicator.innerHTML = `
            <span class="stat-label">Market</span>
            <span class="stat-value" id="market-status-value">
                <span class="status-dot"></span>
                <span class="status-text">Loading...</span>
            </span>
        `;
        
        headerStats.appendChild(statusIndicator);
        
        // Update with current status
        const marketStatus = this.realTimeService.getMarketStatus();
        this.updateMarketStatus(marketStatus);
    }

    updateMarketStatus(statusData) {
        const statusElement = document.getElementById('market-status-value');
        if (!statusElement) return;
        
        const { status, isOpen } = statusData;
        const statusText = isOpen ? 'OPEN' : 'CLOSED';
        const statusClass = isOpen ? 'open' : 'closed';
        
        statusElement.innerHTML = `
            <span class="status-dot ${statusClass}"></span>
            <span class="status-text">${statusText}</span>
        `;
        
        console.log(`📈 Market status updated: ${statusText}`);
    }

    // Animation methods
    animateValueChange(element, newValue) {
        if (!element) return;
        
        // Add to animation queue
        this.animationQueue.push({
            element,
            newValue,
            oldValue: element.textContent,
            timestamp: Date.now()
        });
    }

    startAnimationLoop() {
        const processAnimations = () => {
            if (this.animationQueue.length === 0) {
                requestAnimationFrame(processAnimations);
                return;
            }
            
            // Process up to 5 animations per frame
            const animationsToProcess = this.animationQueue.splice(0, 5);
            
            animationsToProcess.forEach(animation => {
                this.executeValueAnimation(animation);
            });
            
            requestAnimationFrame(processAnimations);
        };
        
        processAnimations();
    }

    executeValueAnimation(animation) {
        const { element, newValue, oldValue } = animation;
        
        // Skip if value hasn't changed
        if (oldValue === newValue) return;
        
        // Add flash animation class
        element.classList.add('price-update-flash');
        element.textContent = newValue;
        
        // Remove flash class after animation
        setTimeout(() => {
            element.classList.remove('price-update-flash');
        }, 600);
    }

    addPulseAnimation(element, direction) {
        if (!element) return;
        
        element.classList.remove('pulse-positive', 'pulse-negative');
        element.classList.add(`pulse-${direction}`);
        
        setTimeout(() => {
            element.classList.remove(`pulse-${direction}`);
        }, 1000);
    }

    addShimmerAnimation(element) {
        if (!element) return;
        
        element.classList.add('shimmer');
        setTimeout(() => {
            element.classList.remove('shimmer');
        }, 800);
    }

    showPriceAlert(symbol, change) {
        // Only show alerts for significant changes (>2%)
        const changePercent = Math.abs(change / this.realTimeService.getCurrentPrice(symbol)?.price * 100);
        if (changePercent < 2) return;
        
        const alertType = change >= 0 ? 'success' : 'warning';
        const direction = change >= 0 ? '📈' : '📉';
        const changeText = change >= 0 ? `+${change.toFixed(2)}` : change.toFixed(2);
        
        this.notificationService?.show(
            alertType,
            `${direction} ${symbol}`,
            `Price moved ${changeText} (${changePercent.toFixed(1)}%)`
        );
    }

    // Watch management
    getWatchedSymbols() {
        const symbols = new Set();
        
        // Get symbols from stock cards
        document.querySelectorAll('[data-symbol]').forEach(element => {
            const symbol = element.dataset.symbol;
            if (symbol) symbols.add(symbol);
        });
        
        return Array.from(symbols);
    }

    addSymbolToWatch(symbol) {
        this.realTimeService.watchSymbols([symbol]);
        
        // Update subscription with new symbol
        if (this.unsubscribe) {
            this.unsubscribe();
        }
        this.setupSubscription();
    }

    removeSymbolFromWatch(symbol) {
        this.realTimeService.unwatchSymbols([symbol]);
    }

    // Performance monitoring
    getStats() {
        return {
            ...this.realTimeService.getPerformanceStats(),
            animationQueue: this.animationQueue.length,
            trackedElements: this.priceElements.size
        };
    }

    // Cleanup
    destroy() {
        console.log('📊 Shutting down Real-Time Price Display...');
        
        if (this.unsubscribe) {
            this.unsubscribe();
        }
        
        this.priceElements.clear();
        this.animationQueue = [];
    }
}