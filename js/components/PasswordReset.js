/**
 * Password Reset Component
 * Handles forgot password and password reset functionality with standardized services
 */
class PasswordReset {
    constructor(
        authService = window.lupoAuth,
        notificationService = window.lupoNotifications,
        validationUtils = window.ValidationUtils,
        config = window.lupoConfig
    ) {
        this.authService = authService;
        this.notificationService = notificationService;
        this.validationUtils = validationUtils;
        this.config = config;
        
        this.resetAttempts = 0;
        this.maxResetAttempts = this.config.get('auth.maxResetAttempts', 3);
        this.rateLimitDelay = this.config.get('auth.rateLimitDelay', 60000); // 1 minute
        
        this.init();
    }

    init() {
        // Setup forgot password link
        const forgotPasswordLink = document.getElementById('forgot-password');
        if (forgotPasswordLink) {
            forgotPasswordLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.showForgotPasswordModal();
            });
        }
    }

    showForgotPasswordModal() {
        const modalHTML = `
            <div id="password-reset-modal" class="modal">
                <div class="modal-overlay"></div>
                <div class="modal-content">
                    <div class="modal-header">
                        <h2>Reset Password</h2>
                        <button id="close-password-reset" class="modal-close">
                            <span class="close-icon"></span>
                        </button>
                    </div>
                    <div class="modal-body">
                        <form id="password-reset-form" class="password-reset-form">
                            <div class="form-step" id="step-email">
                                <p class="reset-description">
                                    Enter your email address and we'll send you a link to reset your password.
                                </p>
                                
                                <div class="form-group">
                                    <label for="reset-email">Email Address</label>
                                    <input type="email" id="reset-email" required 
                                           placeholder="Enter your email address">
                                </div>
                                
                                <div class="form-actions">
                                    <button type="submit" class="btn btn-primary">
                                        <span class="btn-text">Send Reset Link</span>
                                    </button>
                                    <button type="button" class="btn btn-secondary" id="cancel-reset">
                                        Cancel
                                    </button>
                                </div>
                            </div>
                            
                            <div class="form-step hidden" id="step-success">
                                <div class="success-message">
                                    <div class="success-icon">✅</div>
                                    <h3>Check Your Email</h3>
                                    <p>We've sent a password reset link to your email address. 
                                       Click the link in the email to reset your password.</p>
                                    <small>Didn't receive the email? Check your spam folder or 
                                           <a href="#" id="resend-link">resend the link</a>.</small>
                                </div>
                                
                                <div class="form-actions">
                                    <button type="button" class="btn btn-primary" id="back-to-login">
                                        Back to Login
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;

        // Remove existing modal if any
        const existingModal = document.getElementById('password-reset-modal');
        if (existingModal) {
            existingModal.remove();
        }

        // Add to DOM
        document.body.insertAdjacentHTML('beforeend', modalHTML);

        // Show modal
        const modal = document.getElementById('password-reset-modal');
        modal.classList.remove('hidden');

        // Setup event listeners
        this.setupModalListeners();

        // Focus on email input
        document.getElementById('reset-email').focus();
    }

    setupModalListeners() {
        const modal = document.getElementById('password-reset-modal');
        const closeBtn = document.getElementById('close-password-reset');
        const cancelBtn = document.getElementById('cancel-reset');
        const backToLoginBtn = document.getElementById('back-to-login');
        const overlay = modal.querySelector('.modal-overlay');
        const form = document.getElementById('password-reset-form');
        const resendLink = document.getElementById('resend-link');

        // Close modal handlers
        const closeModal = () => modal.remove();
        closeBtn.addEventListener('click', closeModal);
        cancelBtn.addEventListener('click', closeModal);
        backToLoginBtn.addEventListener('click', closeModal);
        overlay.addEventListener('click', closeModal);

        // ESC key to close
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                closeModal();
                document.removeEventListener('keydown', handleEscape);
            }
        };
        document.addEventListener('keydown', handleEscape);

        // Form submission
        form.addEventListener('submit', (e) => this.handlePasswordReset(e));

        // Resend link
        if (resendLink) {
            resendLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.resendResetEmail();
            });
        }
    }

    async handlePasswordReset(e) {
        e.preventDefault();
        
        const email = document.getElementById('reset-email').value;
        const submitBtn = document.querySelector('#password-reset-form .btn-primary');

        // Enhanced validation using ValidationUtils
        const validation = this.validationUtils.validateForm({ email }, {
            email: ['required', 'email']
        });
        
        if (!validation.isValid) {
            this.notificationService.warning('Invalid Input', validation.errors.email || 'Please enter a valid email address');
            return;
        }
        
        // Check rate limiting
        if (this.resetAttempts >= this.maxResetAttempts) {
            this.notificationService.error('Too Many Attempts', 'Please wait before trying again');
            return;
        }

        // Show loading state
        submitBtn.disabled = true;
        const originalText = submitBtn.querySelector('.btn-text').textContent;
        submitBtn.querySelector('.btn-text').textContent = 'Sending...';

        try {
            this.resetAttempts++;
            const result = await this.authService.resetPassword(email);
            
            // Show success step regardless of actual result for security
            this.showSuccessStep();
            
            this.notificationService.success(
                'Reset Link Sent', 
                'If this email is registered, you will receive reset instructions'
            );
            
            // Reset attempts on success
            this.resetAttempts = 0;
            
        } catch (error) {
            console.error('❌ Password reset error:', error);
            
            if (error.name === 'ValidationError') {
                this.notificationService.warning('Validation Error', error.message);
            } else if (error.name === 'AuthError') {
                // Still show success for security (don't reveal if email exists)
                this.showSuccessStep();
                this.notificationService.success(
                    'Reset Link Sent', 
                    'If this email is registered, you will receive reset instructions'
                );
            } else {
                this.notificationService.error(
                    'Reset Failed', 
                    'Network error - please try again'
                );
            }
        } finally {
            // Reset button state
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.querySelector('.btn-text').textContent = originalText;
            }
        }
    }

    showSuccessStep() {
        const emailStep = document.getElementById('step-email');
        const successStep = document.getElementById('step-success');
        
        emailStep.classList.add('hidden');
        successStep.classList.remove('hidden');
    }

    async resendResetEmail() {
        const email = document.getElementById('reset-email').value;
        
        // Check rate limiting for resend
        if (this.resetAttempts >= this.maxResetAttempts) {
            this.notificationService.error('Too Many Attempts', 'Please wait before requesting another reset link');
            return;
        }
        
        try {
            this.resetAttempts++;
            await this.authService.resetPassword(email);
            this.notificationService.success('Link Resent', 'Reset instructions sent again if email is registered');
        } catch (error) {
            console.error('❌ Resend reset error:', error);
            // Always show success for security reasons
            this.notificationService.success('Link Resent', 'Reset instructions sent again if email is registered');
        }
    }

    // Handle password reset from URL (when user clicks email link)
    static handleResetFromUrl() {
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('reset_token');
        
        if (token) {
            // Show password reset form with token
            const passwordReset = new PasswordReset();
            passwordReset.showNewPasswordForm(token);
        }
    }

    showNewPasswordForm(token) {
        const modalHTML = `
            <div id="new-password-modal" class="modal">
                <div class="modal-overlay"></div>
                <div class="modal-content">
                    <div class="modal-header">
                        <h2>Set New Password</h2>
                        <button id="close-new-password" class="modal-close">
                            <span class="close-icon"></span>
                        </button>
                    </div>
                    <div class="modal-body">
                        <form id="new-password-form" class="new-password-form">
                            <p class="reset-description">
                                Enter your new password below.
                            </p>
                            
                            <div class="form-group">
                                <label for="new-password">New Password</label>
                                <input type="password" id="new-password" required minlength="6"
                                       placeholder="Enter new password">
                                <small class="form-help">Minimum 6 characters</small>
                            </div>
                            
                            <div class="form-group">
                                <label for="confirm-password">Confirm Password</label>
                                <input type="password" id="confirm-password" required
                                       placeholder="Confirm new password">
                            </div>
                            
                            <div class="form-actions">
                                <button type="submit" class="btn btn-primary">
                                    <span class="btn-text">Update Password</span>
                                </button>
                                <button type="button" class="btn btn-secondary" id="cancel-new-password">
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;

        // Add to DOM
        document.body.insertAdjacentHTML('beforeend', modalHTML);

        // Show modal
        const modal = document.getElementById('new-password-modal');
        modal.classList.remove('hidden');

        // Setup event listeners for new password form
        this.setupNewPasswordListeners(token);

        // Focus on password input
        document.getElementById('new-password').focus();
    }

    setupNewPasswordListeners(token) {
        const modal = document.getElementById('new-password-modal');
        const closeBtn = document.getElementById('close-new-password');
        const cancelBtn = document.getElementById('cancel-new-password');
        const overlay = modal.querySelector('.modal-overlay');
        const form = document.getElementById('new-password-form');

        // Close modal handlers
        const closeModal = () => {
            modal.remove();
            // Remove reset token from URL
            window.history.replaceState({}, document.title, window.location.pathname);
        };
        
        closeBtn.addEventListener('click', closeModal);
        cancelBtn.addEventListener('click', closeModal);
        overlay.addEventListener('click', closeModal);

        // Form submission
        form.addEventListener('submit', (e) => this.handleNewPassword(e, token));
    }

    async handleNewPassword(e, token) {
        e.preventDefault();
        
        const newPassword = document.getElementById('new-password').value;
        const confirmPassword = document.getElementById('confirm-password').value;
        const submitBtn = document.querySelector('#new-password-form .btn-primary');

        // Enhanced validation using ValidationUtils
        const validation = this.validationUtils.validateForm(
            { password: newPassword, confirmPassword },
            {
                password: ['required', { rule: 'minLength', value: 6 }],
                confirmPassword: ['required']
            }
        );
        
        if (!validation.isValid) {
            const errorMessage = Object.values(validation.errors)[0];
            this.notificationService.warning('Validation Error', errorMessage);
            return;
        }
        
        if (newPassword !== confirmPassword) {
            this.notificationService.warning('Password Mismatch', 'Passwords do not match');
            return;
        }

        // Show loading state
        submitBtn.disabled = true;
        const originalText = submitBtn.querySelector('.btn-text').textContent;
        submitBtn.querySelector('.btn-text').textContent = 'Updating...';

        try {
            // Use the standardized API client instead of direct fetch
            const response = await this.authService.apiClient.post('/auth/update-password', {
                token: token,
                password: newPassword
            });
            
            if (response.isSuccess()) {
                this.notificationService.success(
                    'Password Updated', 
                    'Your password has been successfully updated'
                );
                
                // Close modal and redirect to login
                document.getElementById('new-password-modal').remove();
                window.history.replaceState({}, document.title, window.location.pathname);
                
                // Dispatch event for other components
                this.dispatchPasswordEvent('password:updated', { timestamp: Date.now() });
                
            } else {
                throw new Error(response.getError());
            }
        } catch (error) {
            console.error('❌ Password update error:', error);
            
            if (error.name === 'ValidationError') {
                this.notificationService.warning('Validation Error', error.message);
            } else {
                this.notificationService.error(
                    'Update Failed', 
                    'Failed to update password - please try again'
                );
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
     * Dispatch password-related events
     */
    dispatchPasswordEvent(type, data) {
        const event = new CustomEvent(type, {
            detail: { data, timestamp: Date.now() }
        });
        window.dispatchEvent(event);
    }

    /**
     * Check if rate limited
     */
    isRateLimited() {
        return this.resetAttempts >= this.maxResetAttempts;
    }

    /**
     * Reset rate limiting after delay
     */
    resetRateLimit() {
        setTimeout(() => {
            this.resetAttempts = 0;
        }, this.rateLimitDelay);
    }

    /**
     * Get component statistics
     */
    getStats() {
        return {
            resetAttempts: this.resetAttempts,
            maxResetAttempts: this.maxResetAttempts,
            isRateLimited: this.isRateLimited()
        };
    }
}