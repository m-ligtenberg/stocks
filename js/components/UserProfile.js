/**
 * User Profile Management Component
 * Handles user profile viewing, editing, and settings
 */
class UserProfile {
    constructor(authService, notificationService) {
        this.authService = authService;
        this.notificationService = notificationService;
        this.currentUser = null;
        this.init();
    }

    init() {
        // Setup user menu button click
        const userMenuBtn = document.getElementById('user-menu-btn');
        if (userMenuBtn) {
            userMenuBtn.addEventListener('click', () => this.showUserMenu());
        }

        // Load current user data
        this.currentUser = this.authService.getUser();
        this.updateUserDisplay();
    }

    updateUserDisplay() {
        const userNameElement = document.querySelector('.user-name');
        if (userNameElement && this.currentUser) {
            userNameElement.textContent = this.currentUser.firstName || 'Account';
        }
    }

    showUserMenu() {
        const menuHTML = `
            <div id="user-menu" class="user-menu">
                <div class="user-menu-header">
                    <div class="user-avatar">
                        <span class="user-initial">${this.getUserInitial()}</span>
                    </div>
                    <div class="user-info">
                        <div class="user-name-display">${this.getUserDisplayName()}</div>
                        <div class="user-email">${this.currentUser?.email || 'demo@lupo.com'}</div>
                    </div>
                </div>
                
                <div class="user-menu-items">
                    <button class="menu-item" id="view-profile">
                        <span class="menu-icon profile-icon"></span>
                        <span class="menu-text">View Profile</span>
                    </button>
                    
                    <button class="menu-item" id="account-settings">
                        <span class="menu-icon settings-icon"></span>
                        <span class="menu-text">Account Settings</span>
                    </button>
                    
                    <button class="menu-item" id="trading-history">
                        <span class="menu-icon history-icon"></span>
                        <span class="menu-text">Trading History</span>
                    </button>
                    
                    <button class="menu-item" id="security-settings">
                        <span class="menu-icon security-icon"></span>
                        <span class="menu-text">Security</span>
                    </button>
                    
                    <div class="menu-divider"></div>
                    
                    <button class="menu-item" id="help-support">
                        <span class="menu-icon help-icon"></span>
                        <span class="menu-text">Help & Support</span>
                    </button>
                    
                    <button class="menu-item logout-item" id="logout">
                        <span class="menu-icon logout-icon"></span>
                        <span class="menu-text">Sign Out</span>
                    </button>
                </div>
            </div>
        `;

        // Remove existing menu
        const existingMenu = document.getElementById('user-menu');
        if (existingMenu) {
            existingMenu.remove();
            return; // Toggle behavior
        }

        // Add menu to header actions
        const headerActions = document.querySelector('.header-actions');
        if (headerActions) {
            headerActions.insertAdjacentHTML('beforeend', menuHTML);
            
            // Setup menu event listeners
            this.setupMenuListeners();
            
            // Close menu when clicking outside
            setTimeout(() => {
                document.addEventListener('click', this.handleOutsideClick.bind(this), { once: true });
            }, 0);
        }
    }

    setupMenuListeners() {
        // Profile actions
        document.getElementById('view-profile')?.addEventListener('click', () => {
            this.hideUserMenu();
            this.showProfileModal();
        });

        document.getElementById('account-settings')?.addEventListener('click', () => {
            this.hideUserMenu();
            this.showAccountSettings();
        });

        document.getElementById('trading-history')?.addEventListener('click', () => {
            this.hideUserMenu();
            this.showTradingHistory();
        });

        document.getElementById('security-settings')?.addEventListener('click', () => {
            this.hideUserMenu();
            this.showSecuritySettings();
        });

        document.getElementById('help-support')?.addEventListener('click', () => {
            this.hideUserMenu();
            this.showHelpSupport();
        });

        document.getElementById('logout')?.addEventListener('click', () => {
            this.hideUserMenu();
            this.handleLogout();
        });
    }

    handleOutsideClick(e) {
        const userMenu = document.getElementById('user-menu');
        const userMenuBtn = document.getElementById('user-menu-btn');
        
        if (userMenu && !userMenu.contains(e.target) && !userMenuBtn.contains(e.target)) {
            this.hideUserMenu();
        }
    }

    hideUserMenu() {
        const userMenu = document.getElementById('user-menu');
        if (userMenu) {
            userMenu.remove();
        }
    }

    getUserInitial() {
        if (this.currentUser?.firstName) {
            return this.currentUser.firstName.charAt(0).toUpperCase();
        }
        if (this.currentUser?.email) {
            return this.currentUser.email.charAt(0).toUpperCase();
        }
        return 'U';
    }

    getUserDisplayName() {
        if (this.currentUser?.firstName && this.currentUser?.lastName) {
            return `${this.currentUser.firstName} ${this.currentUser.lastName}`;
        }
        if (this.currentUser?.firstName) {
            return this.currentUser.firstName;
        }
        return 'User';
    }

    showProfileModal() {
        const modalHTML = `
            <div id="profile-modal" class="modal">
                <div class="modal-overlay"></div>
                <div class="modal-content">
                    <div class="modal-header">
                        <h2>User Profile</h2>
                        <button id="close-profile-modal" class="modal-close">
                            <span class="close-icon"></span>
                        </button>
                    </div>
                    <div class="modal-body">
                        <div class="profile-content">
                            <div class="profile-header">
                                <div class="profile-avatar">
                                    <span class="avatar-large">${this.getUserInitial()}</span>
                                </div>
                                <div class="profile-info">
                                    <h3>${this.getUserDisplayName()}</h3>
                                    <p class="profile-email">${this.currentUser?.email || 'demo@lupo.com'}</p>
                                    <p class="profile-joined">Member since ${this.getJoinDate()}</p>
                                </div>
                            </div>
                            
                            <div class="profile-stats">
                                <div class="stat-card">
                                    <div class="stat-number" id="total-trades">-</div>
                                    <div class="stat-label">Total Trades</div>
                                </div>
                                <div class="stat-card">
                                    <div class="stat-number" id="portfolio-value">-</div>
                                    <div class="stat-label">Portfolio Value</div>
                                </div>
                                <div class="stat-card">
                                    <div class="stat-number" id="total-pnl">-</div>
                                    <div class="stat-label">Total P&L</div>
                                </div>
                            </div>
                            
                            <form id="profile-form" class="profile-form">
                                <div class="form-group">
                                    <label for="first-name">First Name</label>
                                    <input type="text" id="first-name" value="${this.currentUser?.firstName || ''}">
                                </div>
                                
                                <div class="form-group">
                                    <label for="last-name">Last Name</label>
                                    <input type="text" id="last-name" value="${this.currentUser?.lastName || ''}">
                                </div>
                                
                                <div class="form-group">
                                    <label for="profile-email">Email</label>
                                    <input type="email" id="profile-email" value="${this.currentUser?.email || ''}" readonly>
                                </div>
                                
                                <div class="form-actions">
                                    <button type="submit" class="btn btn-primary">
                                        <span class="btn-text">Update Profile</span>
                                    </button>
                                    <button type="button" class="btn btn-secondary" id="cancel-profile-edit">
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Add to DOM
        document.body.insertAdjacentHTML('beforeend', modalHTML);

        // Show modal
        const modal = document.getElementById('profile-modal');
        modal.classList.remove('hidden');

        // Setup event listeners
        this.setupProfileModalListeners();

        // Load profile stats
        this.loadProfileStats();
    }

    setupProfileModalListeners() {
        const modal = document.getElementById('profile-modal');
        const closeBtn = document.getElementById('close-profile-modal');
        const cancelBtn = document.getElementById('cancel-profile-edit');
        const overlay = modal.querySelector('.modal-overlay');
        const form = document.getElementById('profile-form');

        // Close modal handlers
        const closeModal = () => modal.remove();
        closeBtn.addEventListener('click', closeModal);
        cancelBtn.addEventListener('click', closeModal);
        overlay.addEventListener('click', closeModal);

        // Form submission
        form.addEventListener('submit', (e) => this.handleProfileUpdate(e));
    }

    async loadProfileStats() {
        try {
            // This would fetch real stats from the API
            const stats = {
                totalTrades: 0,
                portfolioValue: '$10,000.00',
                totalPnL: '$0.00'
            };

            document.getElementById('total-trades').textContent = stats.totalTrades;
            document.getElementById('portfolio-value').textContent = stats.portfolioValue;
            document.getElementById('total-pnl').textContent = stats.totalPnl;
        } catch (error) {
            console.error('❌ Error loading profile stats:', error);
        }
    }

    async handleProfileUpdate(e) {
        e.preventDefault();
        
        const firstName = document.getElementById('first-name').value;
        const lastName = document.getElementById('last-name').value;
        const submitBtn = document.querySelector('#profile-form .btn-primary');

        // Show loading state
        submitBtn.disabled = true;
        const originalText = submitBtn.querySelector('.btn-text').textContent;
        submitBtn.querySelector('.btn-text').textContent = 'Updating...';

        try {
            const response = await fetch('/api/user/profile', {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${this.authService.getToken()}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    firstName,
                    lastName
                })
            });

            const result = await response.json();
            
            if (result.success) {
                // Update local user data
                this.currentUser = { ...this.currentUser, firstName, lastName };
                localStorage.setItem('lupo-user', JSON.stringify(this.currentUser));
                
                this.notificationService.success('Profile Updated', 'Your profile has been updated successfully');
                this.updateUserDisplay();
                
                // Close modal
                document.getElementById('profile-modal').remove();
            } else {
                this.notificationService.error('Update Failed', result.error || 'Failed to update profile');
            }
        } catch (error) {
            console.error('❌ Profile update error:', error);
            this.notificationService.error('Update Failed', 'Network error - please try again');
        } finally {
            // Reset button state
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.querySelector('.btn-text').textContent = originalText;
            }
        }
    }

    showAccountSettings() {
        this.notificationService.info('Coming Soon', 'Account settings will be available soon');
    }

    showTradingHistory() {
        // This would switch to the portfolio tab and show transaction history
        document.querySelector('[data-tab="my-portfolio"]')?.click();
        this.notificationService.info('Trading History', 'Check the Portfolio tab for your trading history');
    }

    showSecuritySettings() {
        this.notificationService.info('Coming Soon', 'Security settings will be available soon');
    }

    showHelpSupport() {
        this.notificationService.info('Help & Support', 'For support, please contact demo@lupo.com');
    }

    handleLogout() {
        // Confirm logout
        const confirmLogout = confirm('Are you sure you want to sign out?');
        if (confirmLogout) {
            this.authService.logout();
            location.reload();
        }
    }

    getJoinDate() {
        // This would come from user data
        return 'January 2024';
    }
}