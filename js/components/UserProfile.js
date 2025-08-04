/**
 * User Profile Management Component
 * Handles user profile viewing, editing, and settings with standardized services
 */
class UserProfile {
    constructor(
        authService = window.lupoAuth,
        notificationService = window.lupoNotifications,
        portfolioService = window.lupoPortfolio,
        validationUtils = window.ValidationUtils,
        storage = window.lupoStorage,
        config = window.lupoConfig
    ) {
        this.authService = authService;
        this.notificationService = notificationService;
        this.portfolioService = portfolioService;
        this.validationUtils = validationUtils;
        this.storage = storage;
        this.config = config;
        
        this.currentUser = null;
        this.profileCache = null;
        this.cacheTimeout = this.config.get('profile.cacheTimeout', 300000); // 5 minutes
        
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
            // Check cache first
            if (this.profileCache && this.isCacheValid()) {
                this.displayStats(this.profileCache.stats);
                return;
            }

            // Fetch real stats from portfolio service
            const portfolio = await this.portfolioService.getPortfolio();
            const transactions = await this.portfolioService.getTransactionHistory(1, 100);
            
            const stats = {
                totalTrades: transactions.data?.length || 0,
                portfolioValue: `$${portfolio.total_value?.toLocaleString() || '0.00'}`,
                totalPnL: this.calculateTotalPnL(portfolio)
            };
            
            // Cache the stats
            this.profileCache = {
                stats,
                timestamp: Date.now()
            };
            
            this.displayStats(stats);
        } catch (error) {
            console.error('❌ Error loading profile stats:', error);
            // Display fallback stats
            this.displayStats({
                totalTrades: '--',
                portfolioValue: '--',
                totalPnL: '--'
            });
        }
    }

    async handleProfileUpdate(e) {
        e.preventDefault();
        
        const firstName = document.getElementById('first-name').value;
        const lastName = document.getElementById('last-name').value;
        const submitBtn = document.querySelector('#profile-form .btn-primary');

        // Enhanced validation using ValidationUtils
        const validation = this.validationUtils.validateForm(
            { firstName, lastName },
            {
                firstName: ['string', { rule: 'maxLength', value: 50 }],
                lastName: ['string', { rule: 'maxLength', value: 50 }]
            }
        );
        
        if (!validation.isValid) {
            const errorMessage = Object.values(validation.errors)[0];
            this.notificationService.warning('Validation Error', errorMessage);
            return;
        }

        // Show loading state
        submitBtn.disabled = true;
        const originalText = submitBtn.querySelector('.btn-text').textContent;
        submitBtn.querySelector('.btn-text').textContent = 'Updating...';

        try {
            // Use standardized API client
            const response = await this.authService.apiClient.put('/user/profile', {
                firstName,
                lastName
            });
            
            if (response.isSuccess()) {
                const updatedUser = response.getData();
                
                // Update local user data using auth service
                this.currentUser = { ...this.currentUser, firstName, lastName };
                this.authService.setUser(this.currentUser);
                
                this.notificationService.success('Profile Updated', 'Your profile has been updated successfully');
                this.updateUserDisplay();
                
                // Clear profile cache
                this.clearProfileCache();
                
                // Dispatch profile update event
                this.dispatchProfileEvent('profile:updated', this.currentUser);
                
                // Close modal
                document.getElementById('profile-modal').remove();
            } else {
                throw new Error(response.getError());
            }
        } catch (error) {
            console.error('❌ Profile update error:', error);
            
            if (error.name === 'ValidationError') {
                this.notificationService.warning('Validation Error', error.message);
            } else {
                this.notificationService.error('Update Failed', 'Failed to update profile - please try again');
            }
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
        // Enhanced logout confirmation with better styling
        this.showLogoutConfirmation();
    }

    getJoinDate() {
        if (this.currentUser?.created_at) {
            return new Date(this.currentUser.created_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long'
            });
        }
        return 'January 2024';
    }

    /**
     * Display profile statistics
     */
    displayStats(stats) {
        const elements = {
            'total-trades': stats.totalTrades,
            'portfolio-value': stats.portfolioValue,
            'total-pnl': stats.totalPnL
        };

        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value;
            }
        });
    }

    /**
     * Calculate total P&L from portfolio
     */
    calculateTotalPnL(portfolio) {
        if (!portfolio.metrics) {
            return '$0.00';
        }

        const pnl = portfolio.metrics.totalGainLoss || 0;
        const prefix = pnl >= 0 ? '+' : '';
        const color = pnl >= 0 ? 'var(--color-retail-positive)' : 'var(--color-retail-negative)';
        
        return `${prefix}$${Math.abs(pnl).toLocaleString()}`;
    }

    /**
     * Check if profile cache is valid
     */
    isCacheValid() {
        if (!this.profileCache) return false;
        return (Date.now() - this.profileCache.timestamp) < this.cacheTimeout;
    }

    /**
     * Clear profile cache
     */
    clearProfileCache() {
        this.profileCache = null;
    }

    /**
     * Dispatch profile events
     */
    dispatchProfileEvent(type, data) {
        const event = new CustomEvent(type, {
            detail: { data, timestamp: Date.now() }
        });
        window.dispatchEvent(event);
    }

    /**
     * Enhanced logout confirmation
     */
    showLogoutConfirmation() {
        const confirmationHTML = `
            <div id="logout-confirmation" class="modal">
                <div class="modal-overlay"></div>
                <div class="modal-content">
                    <div class="modal-header">
                        <h2>Confirm Sign Out</h2>
                    </div>
                    <div class="modal-body">
                        <p>Are you sure you want to sign out of your account?</p>
                        <div class="form-actions">
                            <button id="confirm-logout" class="btn btn-primary">Sign Out</button>
                            <button id="cancel-logout" class="btn btn-secondary">Cancel</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', confirmationHTML);
        
        // Setup event listeners
        document.getElementById('confirm-logout').addEventListener('click', () => {
            this.executeLogout();
        });
        
        document.getElementById('cancel-logout').addEventListener('click', () => {
            document.getElementById('logout-confirmation').remove();
        });
        
        // Close on overlay click
        document.querySelector('#logout-confirmation .modal-overlay').addEventListener('click', () => {
            document.getElementById('logout-confirmation').remove();
        });
    }
    
    executeLogout() {
        try {
            // Clear any cached data
            this.clearProfileCache();
            
            // Use auth service logout
            this.authService.logout();
            
            // Clean up component state
            this.currentUser = null;
            
            // Dispatch logout event
            this.dispatchProfileEvent('profile:logout', null);
            
            // Remove confirmation modal
            const confirmation = document.getElementById('logout-confirmation');
            if (confirmation) confirmation.remove();
            
            // Reload page
            location.reload();
        } catch (error) {
            console.error('❌ Logout error:', error);
            this.notificationService.error('Logout Failed', 'Error signing out - please try again');
        }
    }

    /**
     * Get component statistics
     */
    getStats() {
        return {
            currentUser: this.currentUser?.email || null,
            cacheValid: this.isCacheValid(),
            cacheTimeout: this.cacheTimeout,
            profileCacheSize: this.profileCache ? Object.keys(this.profileCache).length : 0
        };
    }
}