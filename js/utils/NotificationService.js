/**
 * Notification Service
 * Handles toast notifications and user feedback
 */
class NotificationService {
    constructor() {
        this.notifications = [];
        this.maxNotifications = 5;
    }

    showToast(icon, title, message, duration = 4000, type = 'info') {
        const toast = this.createToast(icon, title, message, type);
        this.displayToast(toast, duration);
    }

    createToast(icon, title, message, type) {
        const toastId = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        const toast = {
            id: toastId,
            icon,
            title,
            message,
            type,
            timestamp: new Date()
        };

        // Add to notifications array
        this.notifications.unshift(toast);
        
        // Keep only recent notifications
        if (this.notifications.length > this.maxNotifications) {
            this.notifications = this.notifications.slice(0, this.maxNotifications);
        }

        return toast;
    }

    displayToast(toast, duration) {
        // Create toast container if it doesn't exist
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            container.className = 'toast-container';
            document.body.appendChild(container);
        }

        // Create toast element
        const toastElement = document.createElement('div');
        toastElement.id = toast.id;
        toastElement.className = `toast toast-${toast.type}`;
        
        toastElement.innerHTML = `
            <div class="toast-content">
                <div class="toast-icon">${toast.icon}</div>
                <div class="toast-text">
                    <div class="toast-title">${toast.title}</div>
                    <div class="toast-message">${toast.message}</div>
                </div>
                <button class="toast-close" onclick="this.parentElement.remove()">
                    <span class="close-icon"></span>
                </button>
            </div>
        `;

        // Add to container
        container.appendChild(toastElement);

        // Animate in
        requestAnimationFrame(() => {
            toastElement.classList.add('toast-show');
        });

        // Auto remove
        setTimeout(() => {
            this.removeToast(toast.id);
        }, duration);

        // Click to dismiss
        toastElement.addEventListener('click', () => {
            this.removeToast(toast.id);
        });
    }

    removeToast(toastId) {
        const toastElement = document.getElementById(toastId);
        if (toastElement) {
            toastElement.classList.remove('toast-show');
            toastElement.classList.add('toast-hide');
            
            setTimeout(() => {
                toastElement.remove();
            }, 300);
        }

        // Remove from notifications array
        this.notifications = this.notifications.filter(n => n.id !== toastId);
    }

    clearAll() {
        const container = document.getElementById('toast-container');
        if (container) {
            container.innerHTML = '';
        }
        this.notifications = [];
    }

    getNotifications() {
        return [...this.notifications];
    }

    // Predefined notification types
    success(title, message, duration) {
        this.showToast('✅', title, message, duration, 'success');
    }

    error(title, message, duration) {
        this.showToast('❌', title, message, duration, 'error');
    }

    warning(title, message, duration) {
        this.showToast('⚠️', title, message, duration, 'warning');
    }

    info(title, message, duration) {
        this.showToast('ℹ️', title, message, duration, 'info');
    }

    loading(title, message) {
        return this.showToast('🔄', title, message, 10000, 'loading');
    }
}