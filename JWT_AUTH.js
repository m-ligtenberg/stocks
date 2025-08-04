// In LoginSystem class
async handleLogin() {
  // ... existing code ...
  if (result.success) {
    localStorage.setItem('lupo-auth-token', result.data.token);
    // Add token expiration check
    const tokenExp = result.data.expiresIn ? Date.now() + result.data.expiresIn * 1000 : null;
    localStorage.setItem('lupo-token-exp', tokenExp);
    
    // Store user data securely
    localStorage.setItem('lupo-user', JSON.stringify({
      id: result.data.user.id,
      email: result.data.user.email,
      name: result.data.user.name,
      is2FAEnabled: result.data.user.is2FAEnabled
    }));
    
    // Check if 2FA is required
    if (result.data.user.is2FAEnabled) {
      this.show2FAPrompt();
    } else {
      this.performLogin(loginButton);
    }
  }
  // ... existing code ...
}

show2FAPrompt() {
  // Create 2FA modal
  const modal = document.createElement('div');
  modal.innerHTML = `
    <div class="modal-overlay active">
      <div class="modal-content">
        <h3>Two-Factor Authentication</h3>
        <p>Enter the 6-digit code from your authenticator app</p>
        <div class="code-inputs">
          <input type="text" maxlength="1" class="code-input">
          <input type="text" maxlength="1" class="code-input">
          <input type="text" maxlength="1" class="code-input">
          <input type="text" maxlength="1" class="code-input">
          <input type="text" maxlength="1" class="code-input">
          <input type="text" maxlength="1" class="code-input">
        </div>
        <button id="verify-2fa">Verify</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  
  // Add verification handler
  document.getElementById('verify-2fa').addEventListener('click', async () => {
    const code = Array.from(document.querySelectorAll('.code-input'))
                   .map(input => input.value)
                   .join('');
    // Verify code with backend
    const response = await fetch('/api/auth/verify-2fa', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('lupo-auth-token')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ code })
    });
    
    if (response.ok) {
      this.performLogin();
    } else {
      alert('Invalid verification code');
    }
  });
}
