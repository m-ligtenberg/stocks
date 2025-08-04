/**
 * Trade Modal Component
 * Handles buy/sell order forms and execution
 */
class TradeModal {
    constructor(portfolioService, notificationService) {
        this.portfolioService = portfolioService;
        this.notificationService = notificationService;
        this.currentStock = null;
    }

    async show(action, stock) {
        if (!stock) {
            this.notificationService.showToast('⚠️', 'Error', 'Please select a stock first');
            return;
        }

        this.currentStock = stock;
        const isValidAction = action === 'buy' || action === 'sell';
        
        if (!isValidAction) {
            this.notificationService.showToast('⚠️', 'Error', 'Invalid trade action');
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

        // Validation
        if (!shares || shares <= 0) {
            this.notificationService.showToast('⚠️', 'Invalid Input', 'Please enter a valid number of shares');
            return;
        }

        if (orderType === 'limit' && (!price || price <= 0)) {
            this.notificationService.showToast('⚠️', 'Invalid Input', 'Please enter a valid limit price');
            return;
        }

        // Show loading state
        submitBtn.disabled = true;
        const originalText = submitBtn.querySelector('.btn-text').textContent;
        submitBtn.querySelector('.btn-text').textContent = 'Processing...';

        try {
            const result = await this.portfolioService.executeTrade(stock.symbol, action, shares, price);
            
            if (result.success) {
                this.notificationService.showToast(
                    '✅', 
                    'Trade Executed', 
                    `Successfully ${action === 'buy' ? 'bought' : 'sold'} ${shares} shares of ${stock.symbol}`
                );
                
                // Close modal
                document.getElementById('trade-modal').remove();
                
                // Trigger portfolio refresh event
                document.dispatchEvent(new CustomEvent('portfolioUpdate'));
                
            } else {
                this.notificationService.showToast('❌', 'Trade Failed', result.error || 'Unable to execute trade');
            }
        } catch (error) {
            console.error('Trade execution error:', error);
            this.notificationService.showToast('❌', 'Trade Failed', 'Network error - please try again');
        } finally {
            // Reset button state
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.querySelector('.btn-text').textContent = originalText;
            }
        }
    }
}