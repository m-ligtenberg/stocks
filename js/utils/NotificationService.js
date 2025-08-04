/**
 * Notification Service
 * Handles toast notifications, system alerts, and user feedback
 */
class NotificationService {
    constructor(config = window.lupoConfig, storage = window.lupoStorage) {
        this.config = config;
        this.storage = storage;
        
        // Use safe defaults if config service isn't ready
        this.timeout = config?.get ? config.get('ui.notifications.timeout', 5000) : 5000;
        this.maxVisible = config?.get ? config.get('ui.notifications.maxVisible', 5) : 5;
        this.position = config?.get ? config.get('ui.notifications.position', 'top-right') : 'top-right';
        
        this.notifications = [];
        this.container = null;
        this.nextId = 1;
        
        this.initializeContainer();
        this.loadStoredNotifications();
    }

    /**
     * Initialize notification container
     */
    initializeContainer() {
        // Remove existing container if it exists
        const existing = document.getElementById('notification-container');
        if (existing) {
            existing.remove();
        }

        this.container = document.createElement('div');
        this.container.id = 'notification-container';
        this.container.className = `notification-container ${this.position}`;
        
        // Add styles
        this.container.style.cssText = `
            position: fixed;
            z-index: 10000;
            pointer-events: none;
            ${this.getPositionStyles()}
        `;
        
        document.body.appendChild(this.container);
    }

    /**
     * Get position styles based on configuration
     */
    getPositionStyles() {
        switch (this.position) {
            case 'top-left':
                return 'top: 20px; left: 20px;';
            case 'top-right':
                return 'top: 20px; right: 20px;';
            case 'bottom-left':
                return 'bottom: 20px; left: 20px;';
            case 'bottom-right':
                return 'bottom: 20px; right: 20px;';
            case 'top-center':
                return 'top: 20px; left: 50%; transform: translateX(-50%);';
            case 'bottom-center':
                return 'bottom: 20px; left: 50%; transform: translateX(-50%);';
            default:
                return 'top: 20px; right: 20px;';
        }
    }

    /**
     * Show notification
     */
    show(message, type = 'info', options = {}) {
        const notification = this.createNotification(message, type, options);
        this.addNotification(notification);
        return notification.id;
    }

    /**
     * Show success notification
     */
    success(title, message, duration) {
        return this.show(message, 'success', { title, timeout: duration });
    }

    /**
     * Show error notification
     */
    error(title, message, duration) {
        return this.show(message, 'error', { title, timeout: duration, persistent: true });
    }

    /**
     * Show warning notification
     */
    warning(title, message, duration) {
        return this.show(message, 'warning', { title, timeout: duration });
    }

    /**
     * Show info notification
     */
    info(title, message, duration) {
        return this.show(message, 'info', { title, timeout: duration });
    }

    /**
     * Show loading notification
     */
    loading(title, message) {
        return this.show(message, 'loading', { title, persistent: true });
    }

    /**
     * Show toast (legacy compatibility)
     */
    showToast(icon, title, message, duration = 4000, type = 'info') {
        return this.show(message, type, { title, timeout: duration });
    }

    /**
     * Create notification object
     */
    createNotification(message, type, options = {}) {
        const id = this.nextId++;
        const timestamp = Date.now();
        
        return {
            id,
            message,
            type,
            timestamp,
            title: options.title || null,
            persistent: options.persistent || false,
            timeout: options.timeout || this.timeout,
            onClick: options.onClick || null,
            actions: options.actions || [],
            data: options.data || null
        };
    }

    /**
     * Add notification to queue and display
     */
    addNotification(notification) {
        // Remove oldest if we're at max capacity
        if (this.notifications.length >= this.maxVisible) {
            const oldest = this.notifications.shift();
            this.removeNotificationElement(oldest.id);
        }

        this.notifications.push(notification);
        this.renderNotification(notification);
        
        // Store important notifications
        if (notification.type === 'error' || notification.persistent) {
            this.storeNotification(notification);
        }

        // Auto-remove if not persistent
        if (!notification.persistent) {
            setTimeout(() => {
                this.remove(notification.id);
            }, notification.timeout);
        }

        // Dispatch event
        this.dispatchEvent('notification:shown', notification);
    }

    /**
     * Render notification element
     */
    renderNotification(notification) {
        const element = document.createElement('div');
        element.id = `notification-${notification.id}`;
        element.className = `notification notification-${notification.type}`;
        element.style.cssText = `
            pointer-events: auto;
            margin-bottom: 10px;
            padding: 16px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            background: var(--color-professional-surface);
            border: 1px solid var(--color-professional-border);
            max-width: 400px;
            animation: slideIn 0.3s ease-out;
            cursor: pointer;
            transition: all 0.2s ease;
        `;

        // Add type-specific styling
        this.applyTypeStyles(element, notification.type);

        // Create content
        const content = this.createNotificationContent(notification);
        element.appendChild(content);

        // Add click handler
        if (notification.onClick) {
            element.addEventListener('click', () => notification.onClick(notification));
        }

        // Add to container
        if (this.position.includes('bottom')) {
            this.container.appendChild(element);
        } else {
            this.container.insertBefore(element, this.container.firstChild);
        }

        // Add hover effects
        element.addEventListener('mouseenter', () => {
            element.style.transform = 'scale(1.02)';
        });

        element.addEventListener('mouseleave', () => {
            element.style.transform = 'scale(1)';
        });
    }

    /**
     * Apply type-specific styles
     */
    applyTypeStyles(element, type) {
        const styles = {
            success: 'border-left: 4px solid #10b981; background: rgba(16, 185, 129, 0.1);',
            error: 'border-left: 4px solid #ef4444; background: rgba(239, 68, 68, 0.1);',
            warning: 'border-left: 4px solid #f59e0b; background: rgba(245, 158, 11, 0.1);',
            info: 'border-left: 4px solid #3b82f6; background: rgba(59, 130, 246, 0.1);',
            loading: 'border-left: 4px solid #6366f1; background: rgba(99, 102, 241, 0.1);'
        };

        element.style.cssText += styles[type] || styles.info;
    }

    /**
     * Create notification content
     */
    createNotificationContent(notification) {
        const content = document.createElement('div');
        content.className = 'notification-content';

        // Add icon
        const icon = this.createNotificationIcon(notification.type);
        content.appendChild(icon);

        // Add text content
        const textContent = document.createElement('div');
        textContent.className = 'notification-text';
        textContent.style.cssText = 'margin-left: 12px; flex: 1;';

        if (notification.title) {
            const title = document.createElement('div');
            title.className = 'notification-title';
            title.style.cssText = 'font-weight: 600; margin-bottom: 4px; color: var(--color-professional-text);';
            title.textContent = notification.title;
            textContent.appendChild(title);
        }

        const message = document.createElement('div');
        message.className = 'notification-message';
        message.style.cssText = 'color: var(--color-professional-text-secondary); font-size: 14px; line-height: 1.4;';
        message.textContent = notification.message;
        textContent.appendChild(message);

        content.appendChild(textContent);

        // Add close button
        const closeBtn = document.createElement('button');
        closeBtn.className = 'notification-close';
        closeBtn.style.cssText = `
            background: none;
            border: none;
            color: var(--color-professional-text-secondary);
            cursor: pointer;
            padding: 4px;
            border-radius: 4px;
            margin-left: 8px;
            transition: all 0.2s ease;
        `;
        closeBtn.innerHTML = '✕';
        closeBtn.onclick = (e) => {
            e.stopPropagation();
            this.remove(notification.id);
        };

        content.appendChild(closeBtn);

        // Add actions if any
        if (notification.actions && notification.actions.length > 0) {
            const actions = document.createElement('div');
            actions.className = 'notification-actions';
            actions.style.cssText = 'margin-top: 12px; display: flex; gap: 8px;';

            notification.actions.forEach(action => {
                const btn = document.createElement('button');
                btn.textContent = action.label;
                btn.style.cssText = `
                    background: var(--color-professional-primary);
                    color: white;
                    border: none;
                    padding: 6px 12px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 12px;
                    transition: all 0.2s ease;
                `;
                btn.onclick = (e) => {
                    e.stopPropagation();
                    action.handler(notification);
                    if (action.autoClose !== false) {
                        this.remove(notification.id);
                    }
                };
                actions.appendChild(btn);
            });

            content.appendChild(actions);
        }

        content.style.cssText = 'display: flex; align-items: flex-start;';
        return content;
    }

    /**
     * Create notification icon
     */
    createNotificationIcon(type) {
        const icon = document.createElement('div');
        icon.className = 'notification-icon';
        icon.style.cssText = 'width: 20px; height: 20px; flex-shrink: 0; display: flex; align-items: center; justify-content: center;';

        const icons = {
            success: '✓',
            error: '✕',
            warning: '⚠',
            info: 'ℹ',
            loading: '⟳'
        };

        icon.textContent = icons[type] || icons.info;

        // Add loading animation
        if (type === 'loading') {
            icon.style.animation = 'spin 1s linear infinite';
        }

        return icon;
    }

    /**
     * Remove notification
     */
    remove(id) {
        const index = this.notifications.findIndex(n => n.id === id);
        if (index !== -1) {
            const notification = this.notifications[index];
            this.notifications.splice(index, 1);
            this.removeNotificationElement(id);
            this.dispatchEvent('notification:removed', notification);
        }
    }

    /**
     * Remove notification element from DOM (legacy compatibility)
     */
    removeToast(toastId) {
        this.remove(toastId);
    }

    /**
     * Remove notification element from DOM
     */
    removeNotificationElement(id) {
        const element = document.getElementById(`notification-${id}`);
        if (element) {
            element.style.animation = 'slideOut 0.3s ease-out';
            setTimeout(() => {
                if (element.parentNode) {
                    element.parentNode.removeChild(element);
                }
            }, 300);
        }
    }

    /**
     * Clear all notifications
     */
    clear() {
        this.notifications.forEach(notification => {
            this.removeNotificationElement(notification.id);
        });
        this.notifications = [];
        this.dispatchEvent('notification:cleared', null);
    }

    /**
     * Clear all notifications (legacy compatibility)
     */
    clearAll() {
        this.clear();
    }

    /**
     * Update existing notification
     */
    update(id, updates) {
        const notification = this.notifications.find(n => n.id === id);
        if (notification) {
            Object.assign(notification, updates);
            
            // Re-render if element exists
            const element = document.getElementById(`notification-${id}`);
            if (element) {
                this.removeNotificationElement(id);
                this.renderNotification(notification);
            }
            
            this.dispatchEvent('notification:updated', notification);
        }
    }

    /**
     * Store important notifications
     */
    storeNotification(notification) {
        const stored = this.storage.get('notifications', []);
        stored.push({
            ...notification,
            stored: true
        });
        
        // Keep only last 50
        if (stored.length > 50) {
            stored.splice(0, stored.length - 50);
        }
        
        this.storage.set('notifications', stored);
    }

    /**
     * Load stored notifications
     */
    loadStoredNotifications() {
        if (this.storage?.get) {
            const stored = this.storage.get('notifications', []);
            // Could show critical stored notifications on load if needed
        }
    }

    /**
     * Get notification history
     */
    getHistory() {
        return this.storage.get('notifications', []);
    }

    /**
     * Get notifications (legacy compatibility)
     */
    getNotifications() {
        return [...this.notifications];
    }

    /**
     * Dispatch notification events
     */
    dispatchEvent(type, notification) {
        const event = new CustomEvent(type, {
            detail: { notification, timestamp: Date.now() }
        });
        window.dispatchEvent(event);
    }

    /**
     * Show trading notification
     */
    showTradeNotification(trade, type = 'success') {
        const message = `${trade.type.toUpperCase()} ${trade.shares} ${trade.symbol} at $${trade.price}`;
        const title = type === 'success' ? 'Trade Executed' : 'Trade Failed';
        
        return this.show(message, type, {
            title,
            data: trade,
            actions: type === 'success' ? [{
                label: 'View Portfolio',
                handler: () => {
                    // Navigate to portfolio
                    const event = new CustomEvent('navigate:portfolio');
                    window.dispatchEvent(event);
                }
            }] : []
        });
    }

    /**
     * Show market alert
     */
    showMarketAlert(symbol, price, changePercent) {
        const message = `${symbol} is ${changePercent > 0 ? 'up' : 'down'} ${Math.abs(changePercent).toFixed(2)}% at $${price}`;
        
        return this.show(message, changePercent > 5 ? 'success' : changePercent < -5 ? 'warning' : 'info', {
            title: 'Market Alert',
            data: { symbol, price, changePercent },
            actions: [{
                label: 'View Details',
                handler: () => {
                    // Open stock analysis modal
                    const event = new CustomEvent('show:stock-analysis', { detail: { symbol } });
                    window.dispatchEvent(event);
                }
            }]
        });
    }

    /**
     * Get service statistics
     */
    getStats() {
        return {
            active: this.notifications.length,
            maxVisible: this.maxVisible,
            position: this.position,
            timeout: this.timeout,
            stored: this.getHistory().length
        };
    }
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
    
    @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
    }
    
    .notification:hover .notification-close {
        background: rgba(255, 255, 255, 0.1) !important;
    }
`;
document.head.appendChild(style);

// Create global instance
const lupoNotifications = new NotificationService();

// Export for use
window.NotificationService = NotificationService;
window.lupoNotifications = lupoNotifications;