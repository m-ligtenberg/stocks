class CommunitySystem {
  constructor() {
    this.threads = [];
    this.init();
  }

  async init() {
    try {
      const response = await fetch('/api/community/threads');
      const result = await response.json();
      if (result.success) {
        this.threads = result.data;
        this.renderThreads();
      }
    } catch (error) {
      console.error('Error loading community threads:', error);
    }
  }

  renderThreads() {
    const container = document.getElementById('community-threads');
    if (!container) return;
    
    container.innerHTML = this.threads.map(thread => `
      <div class="community-thread" data-id="${thread.id}">
        <div class="thread-header">
          <span class="symbol">${thread.symbol}</span>
          <h3>${thread.title}</h3>
        </div>
        <div class="thread-meta">
          <span class="author">By ${thread.author}</span>
          <span class="stats">${thread.upvotes} upvotes • ${thread.comments} comments</span>
        </div>
        <p class="thread-preview">${thread.content.substring(0, 200)}...</p>
      </div>
    `).join('');
    
    // Add click handlers
    document.querySelectorAll('.community-thread').forEach(thread => {
      thread.addEventListener('click', (e) => {
        const threadId = e.currentTarget.dataset.id;
        this.showThread(threadId);
      });
    });
  }

  async showThread(threadId) {
    try {
      const response = await fetch(`/api/community/threads/${threadId}`);
      const thread = await response.json();
      
      const modal = document.createElement('div');
      modal.className = 'community-modal';
      modal.innerHTML = `
        <div class="modal-overlay">
          <div class="modal-content">
            <h2>${thread.title}</h2>
            <div class="thread-meta">
              <span class="author">Posted by ${thread.author}</span>
              <span class="date">${thread.date}</span>
              <span class="symbol">${thread.symbol}</span>
            </div>
            <div class="thread-content">
              ${thread.content}
            </div>
            
            <div class="comments-section">
              <h3>Comments (${thread.comments.length})</h3>
              ${thread.comments.map(comment => `
                <div class="comment">
                  <div class="comment-header">
                    <span class="author">${comment.author}</span>
                    <span class="date">${comment.date}</span>
                  </div>
                  <p>${comment.content}</p>
                </div>
              `).join('')}
              
              <div class="add-comment">
                <textarea placeholder="Add your comment..."></textarea>
                <button class="btn btn-primary post-comment">Post Comment</button>
              </div>
            </div>
          </div>
        </div>
      `;
      
      document.body.appendChild(modal);
      
      // Add comment handler
      modal.querySelector('.post-comment').addEventListener('click', async () => {
        const content = modal.querySelector('textarea').value;
        if (!content.trim()) return;
        
        const response = await fetch(`/api/community/threads/${threadId}/comments`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('lupo-auth-token')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ content })
        });
        
        if (response.ok) {
          // Refresh thread
          modal.remove();
          this.showThread(threadId);
        }
      });
      
    } catch (error) {
      console.error('Error loading thread:', error);
    }
  }
}
