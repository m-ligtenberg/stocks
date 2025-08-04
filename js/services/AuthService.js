/**
 * Authentication Service
 * Handles user authentication, registration, and session management
 */
class AuthService {
    constructor() {
        this.BASE_URL = '/api/auth';
        this.TOKEN_KEY = 'lupo-auth-token';
        this.USER_KEY = 'lupo-user';
    }

    async login(email, password, rememberMe = false) {
        try {
            const response = await fetch(`${this.BASE_URL}/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const result = await response.json();
            
            if (result.success && result.data) {
                // Store auth data
                localStorage.setItem(this.TOKEN_KEY, result.data.token);
                localStorage.setItem(this.USER_KEY, JSON.stringify(result.data.user));
                
                if (rememberMe) {
                    localStorage.setItem('lupo-remember-email', email);
                }

                console.log('✅ Login successful');
                return result;
            } else {
                throw new Error(result.error || 'Login failed');
            }
        } catch (error) {
            console.error('❌ Login error:', error);
            throw error;
        }
    }

    async register(userData) {
        try {
            const response = await fetch(`${this.BASE_URL}/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(userData)
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const result = await response.json();
            
            if (result.success && result.data) {
                // Store auth data
                localStorage.setItem(this.TOKEN_KEY, result.data.token);
                localStorage.setItem(this.USER_KEY, JSON.stringify(result.data.user));

                console.log('✅ Registration successful');
                return result;
            } else {
                throw new Error(result.error || 'Registration failed');
            }
        } catch (error) {
            console.error('❌ Registration error:', error);
            throw error;
        }
    }

    async resetPassword(email) {
        try {
            const response = await fetch(`${this.BASE_URL}/reset-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const result = await response.json();
            return result;
        } catch (error) {
            console.error('❌ Password reset error:', error);
            throw error;
        }
    }

    async verifyToken() {
        try {
            const token = this.getToken();
            if (!token) {
                return false;
            }

            const response = await fetch(`${this.BASE_URL}/verify`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                this.logout();
                return false;
            }

            const result = await response.json();
            return result.success;
        } catch (error) {
            console.error('❌ Token verification error:', error);
            this.logout();
            return false;
        }
    }

    logout() {
        localStorage.removeItem(this.TOKEN_KEY);
        localStorage.removeItem(this.USER_KEY);
        console.log('👋 User logged out');
    }

    getToken() {
        return localStorage.getItem(this.TOKEN_KEY);
    }

    getUser() {
        const userStr = localStorage.getItem(this.USER_KEY);
        return userStr ? JSON.parse(userStr) : null;
    }

    isAuthenticated() {
        return !!this.getToken();
    }

    getRememberedEmail() {
        return localStorage.getItem('lupo-remember-email') || '';
    }

    // Auto-refresh token before expiry
    startTokenRefresh() {
        // Check token validity every 30 minutes
        setInterval(async () => {
            if (this.isAuthenticated()) {
                const isValid = await this.verifyToken();
                if (!isValid) {
                    console.log('🔄 Token expired, redirecting to login');
                    this.logout();
                    window.location.href = '/';
                }
            }
        }, 30 * 60 * 1000); // 30 minutes
    }
}