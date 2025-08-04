// Lupo Coming Soon Page - Admin Access
class ComingSoonApp {
    constructor() {
        this.isAdminLoggedIn = this.checkAdminSession();
        this.setupEventListeners();
        
        if (this.isAdminLoggedIn) {
            this.showAdminDashboard();
        } else {
            this.showComingSoon();
        }
        
        console.log('🚀 Lupo Coming Soon - Admin Access Mode');
    }
    
    checkAdminSession() {
        return localStorage.getItem('lupo-admin-session') === 'true';
    }
    
    setupEventListeners() {
        // Admin login button
        document.addEventListener('click', (e) => {
            if (e.target.id === 'admin-login-btn') {
                this.showAdminLoginModal();
            } else if (e.target.id === 'close-admin-modal') {
                this.hideAdminLoginModal();
            } else if (e.target.id === 'admin-logout-btn') {
                this.adminLogout();
            }
        });
        
        // Admin login form
        document.addEventListener('submit', (e) => {
            if (e.target.id === 'admin-login-form') {
                e.preventDefault();
                this.handleAdminLogin();
            }
        });
        
        // Tab switching for admin dashboard
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('nav-tab')) {
                const tabName = e.target.dataset.tab;
                this.switchAdminTab(tabName);
            }
        });
        
        // Keyboard events
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hideAdminLoginModal();
            }
        });
        
        // Modal backdrop click
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-backdrop')) {
                this.hideAdminLoginModal();
            }
        });
    }
    
    showComingSoon() {
        document.getElementById('coming-soon-page').style.display = 'flex';
        document.getElementById('main-app').classList.add('hidden');
        console.log('📋 Showing coming soon page');
    }
    
    showAdminDashboard() {
        document.getElementById('coming-soon-page').style.display = 'none';
        document.getElementById('main-app').classList.remove('hidden');
        console.log('🔐 Admin dashboard loaded');
    }
    
    showAdminLoginModal() {
        const modal = document.getElementById('admin-login-modal');
        modal.style.display = 'flex';
        modal.classList.add('show');
        
        // Focus on email input
        setTimeout(() => {
            document.getElementById('admin-email').focus();
        }, 100);
        
        console.log('🔑 Admin login modal opened');
    }
    
    hideAdminLoginModal() {
        const modal = document.getElementById('admin-login-modal');
        modal.classList.remove('show');
        setTimeout(() => {
            modal.style.display = 'none';
        }, 300);
        
        console.log('❌ Admin login modal closed');
    }
    
    async handleAdminLogin() {
        const email = document.getElementById('admin-email').value.trim();
        const password = document.getElementById('admin-password').value;
        const submitBtn = document.getElementById('admin-login-submit');
        
        if (!email || !password) {
            this.showAdminError('Please enter both email and password');
            return;
        }
        
        // Show loading state
        const originalText = submitBtn.textContent;
        submitBtn.textContent = '🔄 Logging in...';
        submitBtn.disabled = true;
        
        try {
            // Simulate authentication delay
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Authenticate with backend API
            const response = await fetch('/api/auth.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'login',
                    email: email,
                    password: password
                })
            });

            const result = await response.json();

            if (result.success && result.user.role === 'admin') {
                localStorage.setItem('lupo-admin-session', 'true');
                localStorage.setItem('lupo-admin-user', JSON.stringify({
                    ...result.user,
                    loginTime: new Date().toISOString()
                }));
                
                this.isAdminLoggedIn = true;
                this.hideAdminLoginModal();
                this.showAdminDashboard();
                this.showAdminSuccess('Admin login successful');
                
                console.log('✅ Admin authenticated successfully');
            } else {
                throw new Error('Invalid admin credentials or insufficient permissions');
            }
            
        } catch (error) {
            console.error('❌ Admin login failed:', error);
            this.showAdminError('Invalid admin credentials. Please try again.');
            
            // Restore button
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    }
    
    adminLogout() {
        localStorage.removeItem('lupo-admin-session');
        localStorage.removeItem('lupo-admin-user');
        this.isAdminLoggedIn = false;
        this.showComingSoon();
        this.showAdminSuccess('Logged out successfully');
        console.log('🚪 Admin logged out');
    }
    
    switchAdminTab(tabName) {
        console.log('🔄 Switching admin tab to:', tabName);
        
        // Update active tab button
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        const activeTab = document.querySelector(`[data-tab="${tabName}"]`);
        if (activeTab) {
            activeTab.classList.add('active');
        }
        
        // Update active content section
        document.querySelectorAll('.content-tab').forEach(content => {
            content.classList.remove('active');
        });
        const activeContent = document.getElementById(tabName);
        if (activeContent) {
            activeContent.classList.add('active');
            console.log('✅ Admin tab switched to:', tabName);
        }
    }
    
    showAdminError(message) {
        this.showAdminToast('❌', 'Error', message, 'error');
    }
    
    showAdminSuccess(message) {
        this.showAdminToast('✅', 'Success', message, 'success');
    }
    
    showAdminToast(icon, title, message, type = 'info') {
        // Remove existing toasts
        const existingToast = document.querySelector('.admin-toast');
        if (existingToast) {
            existingToast.remove();
        }
        
        // Create toast
        const toast = document.createElement('div');
        toast.className = `admin-toast admin-toast-${type}`;
        toast.innerHTML = `
            <div class="toast-icon">${icon}</div>
            <div class="toast-content">
                <div class="toast-title">${title}</div>
                <div class="toast-message">${message}</div>
            </div>
        `;
        
        document.body.appendChild(toast);
        
        // Show with animation
        setTimeout(() => toast.classList.add('show'), 100);
        
        // Auto remove after 3 seconds
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Initializing Lupo Coming Soon...');
    new ComingSoonApp();
});