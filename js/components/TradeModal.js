/**
 * Trade Modal Component
 * Handles buy/sell order forms and execution with standardized services
 */
class TradeModal {
    constructor(
        portfolioService = window.lupoPortfolio,
        notificationService = window.lupoNotifications,
        validationUtils = window.ValidationUtils,
        storage = window.lupoStorage
    ) {
        this.portfolioService = portfolioService;
        this.notificationService = notificationService;
        this.validationUtils = validationUtils;
        this.storage = storage;
        
        this.currentStock = null;
        this.tradingLimits = {
            maxShares: 10000,
            minShares: 1,
            maxOrderValue: 100000
        };
        
        this.init();
    }

    init() {
        console.log('💼 Initializing Trade Modal Component...');
        this.setupGlobalEventListeners();
    }

    setupGlobalEventListeners() {
        // Listen for trade modal open events
        document.addEventListener('openTradeModal', (e) => {
            const { type, stock } = e.detail;
            this.show(type, stock);
        });
    }

    async show(action, stock) {
        if (!stock) {
            this.notificationService.error('Error', 'Please select a stock first');
            return;
        }

        this.currentStock = stock;
        
        // Validate action using ValidationUtils
        const actionValidation = this.validationUtils.validateString(action, { 
            rule: 'in', 
            values: ['buy', 'sell'] 
        });
        
        if (!actionValidation.isValid) {
            this.notificationService.error('Error', 'Invalid trade action');
            return;
        }

        // Create trade modal HTML
        const tradeModalHTML = this.generateModalHTML(action, stock);

        // Remove existing trade modal if any
        const existingModal = document.getElementById('trade-modal');
        if (existingModal) {
            existingModal.remove();
        }

        // Add to DOM
        document.body.insertAdjacentHTML('beforeend', tradeModalHTML);

        // Show modal
        const modal = document.getElementById('trade-modal');
        modal.classList.remove('hidden');

        // Setup event listeners
        this.setupEventListeners(action, stock);
    }

    generateModalHTML(action, stock) {
        return `
            <div id="trade-modal" class="modal">
                <div class="modal-overlay"></div>
                <div class="modal-content">
                    <div class="modal-header">
                        <h2>${action === 'buy' ? 'Buy' : 'Sell'} ${stock.symbol}</h2>
                        <button id="close-trade-modal" class="modal-close">
                            <span class="close-icon"></span>
                        </button>
                    </div>
                    <div class="modal-body">
                        <div class="trade-form">
                            <div class="stock-info">
                                <div class="stock-header">
                                    <h3>${stock.symbol} - ${stock.name}</h3>
                                    <span class="current-price">$${stock.price.toFixed(2)}</span>
                                </div>
                                <div class="price-change ${stock.change >= 0 ? 'positive' : 'negative'}">
                                    ${stock.change >= 0 ? '+' : ''}${stock.change.toFixed(2)} (${stock.changePercent.toFixed(2)}%)
                                </div>
                            </div>
                            
                            <form id="trade-form" class="trade-form-inputs">
                                <div class="form-group">
                                    <label for="shares">Number of Shares</label>
                                    <input type="number" id="shares" min="1" max="10000" step="1" required
                                           placeholder="Enter number of shares">
                                </div>
                                
                                <div class="form-group">
                                    <label for="order-type">Order Type</label>
                                    <select id="order-type">
                                        <option value="market">Market Order (Immediate)</option>
                                        <option value="limit">Limit Order (Set Price)</option>
                                    </select>
                                </div>
                                
                                <div class="form-group limit-price" style="display: none;">
                                    <label for="limit-price">Limit Price ($)</label>
                                    <input type="number" id="limit-price" step="0.01" 
                                           value="${stock.price.toFixed(2)}"
                                           placeholder="Enter limit price">
                                </div>
                                
                                <div class="trade-summary">
                                    <div class="summary-row">
                                        <span>Estimated Total:</span>
                                        <span id="estimated-total">$0.00</span>
                                    </div>
                                    <div class="summary-row small">
                                        <span>Commission:</span>
                                        <span class="commission">$0.00</span>
                                    </div>
                                </div>
                                
                                <div class="form-actions">
                                    <button type="submit" class="btn btn-primary trade-submit">
                                        <span class="${action === 'buy' ? 'buy-icon' : 'sell-icon'}"></span>
                                        <span class="btn-text">${action === 'buy' ? 'Buy Shares' : 'Sell Shares'}</span>
                                    </button>
                                    <button type="button" class="btn btn-secondary" id="cancel-trade">
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    setupEventListeners(action, stock) {
        const modal = document.getElementById('trade-modal');
        const closeBtn = document.getElementById('close-trade-modal');
        const cancelBtn = document.getElementById('cancel-trade');
        const overlay = modal.querySelector('.modal-overlay');
        const form = document.getElementById('trade-form');
        const sharesInput = document.getElementById('shares');
        const orderTypeSelect = document.getElementById('order-type');
        const limitPriceInput = document.getElementById('limit-price');

        // Close modal handlers
        const closeModal = () => modal.remove();
        closeBtn.addEventListener('click', closeModal);
        cancelBtn.addEventListener('click', closeModal);
        overlay.addEventListener('click', closeModal);

        // ESC key to close
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                closeModal();
                document.removeEventListener('keydown', handleEscape);
            }
        };
        document.addEventListener('keydown', handleEscape);

        // Order type change handler
        orderTypeSelect.addEventListener('change', (e) => {
            const limitPriceGroup = modal.querySelector('.limit-price');
            if (e.target.value === 'limit') {
                limitPriceGroup.style.display = 'block';
                limitPriceInput.focus();
            } else {
                limitPriceGroup.style.display = 'none';
            }
            this.updateEstimatedTotal();
        });

        // Update estimated total on input changes
        sharesInput.addEventListener('input', () => this.updateEstimatedTotal());
        limitPriceInput.addEventListener('input', () => this.updateEstimatedTotal());

        // Form submission
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.executeTrade(action, stock);
        });

        // Focus on shares input
        sharesInput.focus();

        // Initialize estimated total
        this.updateEstimatedTotal();
    }

    updateEstimatedTotal() {
        const sharesInput = document.getElementById('shares');
        const orderTypeSelect = document.getElementById('order-type');
        const limitPriceInput = document.getElementById('limit-price');
        const estimatedTotal = document.getElementById('estimated-total');

        if (!sharesInput || !estimatedTotal) return;

        const shares = parseInt(sharesInput.value) || 0;
        const orderType = orderTypeSelect.value;
        const price = orderType === 'limit' ? 
            parseFloat(limitPriceInput.value) || this.currentStock.price : 
            this.currentStock.price;

        const total = shares * price;
        estimatedTotal.textContent = `$${total.toFixed(2)}`;
    }

    async executeTrade(action, stock) {
        const form = document.getElementById('trade-form');
        const submitBtn = form.querySelector('.trade-submit');
        const shares = parseInt(document.getElementById('shares').value);
        const orderType = document.getElementById('order-type').value;
        const price = orderType === 'limit' ? 
            parseFloat(document.getElementById('limit-price').value) : 
            stock.price;

        // Enhanced validation using ValidationUtils
        const validation = this.validateTradeInput(shares, orderType, price, action, stock);
        if (!validation.isValid) {
            this.notificationService.error('Invalid Input', validation.error);
            return;
        }

        // Show loading state
        submitBtn.disabled = true;
        const originalText = submitBtn.querySelector('.btn-text').textContent;
        submitBtn.querySelector('.btn-text').textContent = 'Processing...';

        try {
            const tradeOptions = {
                orderType,
                limitPrice: orderType === 'limit' ? price : null,
                timestamp: Date.now()
            };
            
            const result = await this.portfolioService.executeTrade(
                stock.symbol, 
                action, 
                shares, 
                tradeOptions
            );
            
            // Use standardized notification service
            this.notificationService.showTradeNotification({
                type: action,
                symbol: stock.symbol,
                shares,
                price: result.executionPrice || price
            }, 'success');
            
            // Store trade in local history for quick access
            this.storeTradeHistory(result);
            
            // Close modal
            document.getElementById('trade-modal').remove();
            
            // Trigger portfolio refresh event
            this.dispatchTradeEvent('trade:completed', result);
            
        } catch (error) {
            console.error('❌ Trade execution error:', error);
            
            if (error.name === 'TradingError') {
                this.notificationService.error('Trade Failed', error.message);
            } else if (error.name === 'ValidationError') {
                this.notificationService.warning('Validation Error', error.message);
            } else {
                this.notificationService.error('Trade Failed', 'Network error - please try again');
            }
        } finally {
            // Reset button state
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.querySelector('.btn-text').textContent = originalText;
            }
        }
    }

    /**
     * Validate trade input parameters
     */
    validateTradeInput(shares, orderType, price, action, stock) {
        // Validate shares
        const sharesValidation = this.validationUtils.validateNumber(shares, {
            min: this.tradingLimits.minShares,
            max: this.tradingLimits.maxShares,
            integer: true
        });
        
        if (!sharesValidation.isValid) {
            return { isValid: false, error: `Shares must be between ${this.tradingLimits.minShares} and ${this.tradingLimits.maxShares}` };
        }

        // Validate limit price if limit order
        if (orderType === 'limit') {
            const priceValidation = this.validationUtils.validateNumber(price, {
                min: 0.01,
                max: 10000
            });
            
            if (!priceValidation.isValid) {
                return { isValid: false, error: 'Please enter a valid limit price' };
            }
        }

        // Validate order value doesn't exceed limits
        const orderValue = shares * (price || stock.price);
        if (orderValue > this.tradingLimits.maxOrderValue) {
            return { isValid: false, error: `Order value exceeds maximum limit of $${this.tradingLimits.maxOrderValue.toLocaleString()}` };
        }

        return { isValid: true };
    }

    /**
     * Store trade in local history
     */
    storeTradeHistory(tradeResult) {
        try {
            const tradeHistory = this.storage.get('tradeHistory', []);
            tradeHistory.push({
                ...tradeResult,
                timestamp: Date.now(),
                stored: true
            });
            
            // Keep only last 50 trades
            if (tradeHistory.length > 50) {
                tradeHistory.splice(0, tradeHistory.length - 50);
            }
            
            this.storage.set('tradeHistory', tradeHistory);
        } catch (error) {
            console.error('❌ Error storing trade history:', error);
        }
    }

    /**
     * Dispatch trade events
     */
    dispatchTradeEvent(type, data) {
        const event = new CustomEvent(type, {
            detail: { data, timestamp: Date.now() }
        });
        window.dispatchEvent(event);
    }

    /**
     * Get user's recent trades for context
     */
    getRecentTrades(symbol = null) {
        const history = this.storage.get('tradeHistory', []);
        if (symbol) {
            return history.filter(trade => trade.symbol === symbol).slice(-5);
        }
        return history.slice(-10);
    }

    /**
     * Get component statistics
     */
    getStats() {
        return {
            currentStock: this.currentStock?.symbol || null,
            tradingLimits: this.tradingLimits,
            recentTradeCount: this.getRecentTrades().length
        };
    }
}