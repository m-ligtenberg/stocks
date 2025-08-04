/**
 * Authentication Service
 * Handles user authentication, registration, and session management
 */
class AuthService {
    constructor(apiClient = window.lupoApiClient, config = window.lupoConfig, storage = window.lupoStorage) {
        this.apiClient = apiClient;
        this.config = config;
        this.storage = storage;
        
        this.tokenKey = this.config.get('auth.tokenKey');
        this.userKey = this.config.get('auth.userKey');
        this.rememberMeKey = this.config.get('auth.rememberMeKey');
        this.sessionTimeout = this.config.get('auth.sessionTimeout');
        this.refreshInterval = this.config.get('auth.refreshInterval');
        
        this.initializeRefreshTimer();
    }

    /**
     * User login
     */
    async login(email, password, rememberMe = false) {
        try {
            const response = await this.apiClient.post('/auth/login', {
                email,
                password
            });

            if (response.isSuccess()) {
                const data = response.getData();
                
                // Store authentication data
                this.setAuthToken(data.token);
                this.setUser(data.user);
                
                if (rememberMe && email) {
                    this.storage.set(this.rememberMeKey, email, { ttl: 30 * 24 * 60 * 60 * 1000 }); // 30 days
                }

                // Dispatch login event
                this.dispatchAuthEvent('login', data.user);
                
                console.log('✅ Login successful for:', email);
                return data;
            } else {
                throw new Error(response.getError());
            }
        } catch (error) {
            console.error('❌ Login error:', error.message);
            throw new AuthError('Login failed: ' + error.message);
        }
    }

    /**
     * User registration
     */
    async register(userData) {
        try {
            const validation = ValidationUtils.validateForm(userData, {
                email: ['required', 'email'],
                password: ['required', { rule: 'minLength', value: 6 }],
                firstName: ['string'],
                lastName: ['string']
            });

            if (!validation.isValid) {
                throw new ValidationError('Registration validation failed', validation.errors);
            }

            const response = await this.apiClient.post('/auth/register', userData);

            if (response.isSuccess()) {
                const data = response.getData();
                
                // Store authentication data
                this.setAuthToken(data.token);
                this.setUser(data.user);

                // Dispatch registration event
                this.dispatchAuthEvent('register', data.user);
                
                console.log('✅ Registration successful for:', userData.email);
                return data;
            } else {
                throw new Error(response.getError());
            }
        } catch (error) {
            console.error('❌ Registration error:', error.message);
            throw new AuthError('Registration failed: ' + error.message);
        }
    }

    /**
     * Password reset request
     */
    async resetPassword(email) {
        try {
            const validation = ValidationUtils.validateEmail(email);
            if (!validation.isValid) {
                throw new ValidationError('Invalid email format');
            }

            const response = await this.apiClient.post('/auth/reset-password', { email });
            
            if (response.isSuccess()) {
                console.log('✅ Password reset email sent to:', email);
                return response.getData();
            } else {
                throw new Error(response.getError());
            }
        } catch (error) {
            console.error('❌ Password reset error:', error.message);
            throw new AuthError('Password reset failed: ' + error.message);
        }
    }

    /**
     * Verify authentication token
     */
    async verifyToken() {
        try {
            const token = this.getAuthToken();
            if (!token) {
                return false;
            }

            const response = await this.apiClient.post('/auth/verify');
            
            if (response.isSuccess()) {
                const data = response.getData();
                this.setUser(data.user);
                return true;
            } else {
                this.logout();
                return false;
            }
        } catch (error) {
            if (error.isAuthError()) {
                console.log('🔄 Token expired, logging out');
                this.logout();
                return false;
            }
            console.error('❌ Token verification error:', error.message);
            return false;
        }
    }

    /**
     * Logout user
     */
    logout() {
        // Clear stored data
        this.clearAuthToken();
        this.clearUser();
        
        // Clear refresh timer
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
            this.refreshTimer = null;
        }

        // Dispatch logout event
        this.dispatchAuthEvent('logout', null);
        
        console.log('👋 User logged out');
    }

    /**
     * Check if user is authenticated
     */
    isAuthenticated() {
        const token = this.getAuthToken();
        const user = this.getUser();
        return !!(token && user);
    }

    /**
     * Get authentication token
     */
    getAuthToken() {
        return this.storage.get(this.tokenKey);
    }

    /**
     * Set authentication token
     */
    setAuthToken(token) {
        if (token) {
            this.storage.set(this.tokenKey, token, { ttl: this.sessionTimeout });
            this.apiClient.setAuthToken(token);
        }
    }

    /**
     * Clear authentication token
     */
    clearAuthToken() {
        this.storage.remove(this.tokenKey);
        this.apiClient.removeAuthToken();
    }

    /**
     * Get current user
     */
    getUser() {
        return this.storage.get(this.userKey);
    }

    /**
     * Set current user
     */
    setUser(user) {
        if (user) {
            this.storage.set(this.userKey, user, { ttl: this.sessionTimeout });
        }
    }

    /**
     * Clear current user
     */
    clearUser() {
        this.storage.remove(this.userKey);
    }

    /**
     * Get remembered email
     */
    getRememberedEmail() {
        return this.storage.get(this.rememberMeKey, '');
    }

    /**
     * Clear remembered email
     */
    clearRememberedEmail() {
        this.storage.remove(this.rememberMeKey);
    }

    /**
     * Get user role
     */
    getUserRole() {
        const user = this.getUser();
        return user?.role || 'user';
    }

    /**
     * Check if user has specific role
     */
    hasRole(role) {
        return this.getUserRole() === role;
    }

    /**
     * Check if user is admin
     */
    isAdmin() {
        return this.hasRole('admin');
    }

    /**
     * Initialize token refresh timer
     */
    initializeRefreshTimer() {
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
        }

        this.refreshTimer = setInterval(async () => {
            if (this.isAuthenticated()) {
                const isValid = await this.verifyToken();
                if (!isValid) {
                    console.log('🔄 Token expired, redirecting to login');
                    this.handleSessionExpiry();
                }
            }
        }, this.refreshInterval);
    }

    /**
     * Handle session expiry
     */
    handleSessionExpiry() {
        this.logout();
        
        // Redirect to login if not already there
        if (window.location.pathname !== '/' && !window.location.pathname.includes('login')) {
            window.location.href = '/';
        }
    }

    /**
     * Dispatch authentication events
     */
    dispatchAuthEvent(type, user) {
        const event = new CustomEvent(`auth:${type}`, {
            detail: { user, timestamp: Date.now() }
        });
        window.dispatchEvent(event);
    }

    /**
     * Get authentication status
     */
    getAuthStatus() {
        return {
            isAuthenticated: this.isAuthenticated(),
            user: this.getUser(),
            token: this.getAuthToken(),
            role: this.getUserRole(),
            rememberedEmail: this.getRememberedEmail()
        };
    }

    /**
     * Refresh authentication state
     */
    async refreshAuth() {
        if (this.isAuthenticated()) {
            return await this.verifyToken();
        }
        return false;
    }
}

/**
 * Authentication Error Class
 */
class AuthError extends Error {
    constructor(message, details = null) {
        super(message);
        this.name = 'AuthError';
        this.details = details;
    }
}

/**
 * Validation Error Class
 */
class ValidationError extends Error {
    constructor(message, errors = null) {
        super(message);
        this.name = 'ValidationError';
        this.errors = errors;
    }
}

// Create global instance
const lupoAuth = new AuthService();

// Export for use
window.AuthService = AuthService;
window.AuthError = AuthError;
window.ValidationError = ValidationError;
window.lupoAuth = lupoAuth;