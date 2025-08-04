/**
 * Password Reset Component
 * Handles forgot password and password reset functionality
 */
class PasswordReset {
    constructor(authService, notificationService) {
        this.authService = authService;
        this.notificationService = notificationService;
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

        if (!email) {
            this.notificationService.warning('Invalid Input', 'Please enter your email address');
            return;
        }

        // Show loading state
        submitBtn.disabled = true;
        const originalText = submitBtn.querySelector('.btn-text').textContent;
        submitBtn.querySelector('.btn-text').textContent = 'Sending...';

        try {
            const result = await this.authService.resetPassword(email);
            
            if (result.success) {
                // Show success step
                this.showSuccessStep();
                
                this.notificationService.success(
                    'Reset Link Sent', 
                    'Check your email for password reset instructions'
                );
            } else {
                this.notificationService.error(
                    'Reset Failed', 
                    result.error || 'Failed to send reset email'
                );
            }
        } catch (error) {
            console.error('❌ Password reset error:', error);
            this.notificationService.error(
                'Reset Failed', 
                'Network error - please try again'
            );
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
        
        try {
            await this.authService.resetPassword(email);
            this.notificationService.success('Link Resent', 'Password reset email sent again');
        } catch (error) {
            console.error('❌ Resend reset error:', error);
            this.notificationService.error('Resend Failed', 'Failed to resend reset email');
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

        // Validation
        if (newPassword !== confirmPassword) {
            this.notificationService.warning('Password Mismatch', 'Passwords do not match');
            return;
        }

        if (newPassword.length < 6) {
            this.notificationService.warning('Password Too Short', 'Password must be at least 6 characters');
            return;
        }

        // Show loading state
        submitBtn.disabled = true;
        const originalText = submitBtn.querySelector('.btn-text').textContent;
        submitBtn.querySelector('.btn-text').textContent = 'Updating...';

        try {
            // This would call a new endpoint for updating password with token
            const response = await fetch('/api/auth/update-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    token: token,
                    password: newPassword
                })
            });

            const result = await response.json();
            
            if (result.success) {
                this.notificationService.success(
                    'Password Updated', 
                    'Your password has been successfully updated'
                );
                
                // Close modal and redirect to login
                document.getElementById('new-password-modal').remove();
                window.history.replaceState({}, document.title, window.location.pathname);
                
            } else {
                this.notificationService.error(
                    'Update Failed', 
                    result.error || 'Failed to update password'
                );
            }
        } catch (error) {
            console.error('❌ Password update error:', error);
            this.notificationService.error(
                'Update Failed', 
                'Network error - please try again'
            );
        } finally {
            // Reset button state
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.querySelector('.btn-text').textContent = originalText;
            }
        }
    }
}