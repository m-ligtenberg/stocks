class EducationHub {
  constructor() {
    this.content = [
      {
        id: 'market-structure',
        title: 'Understanding Market Structure',
        category: 'Beginner',
        content: `Market structure refers to the organization and characteristics of financial markets...`,
        videos: ['https://youtube.com/embed/market-structure']
      },
      {
        id: 'technical-analysis',
        title: 'Introduction to Technical Analysis',
        category: 'Intermediate',
        content: `Technical analysis involves studying historical price charts to predict future price movements...`
      }
    ];
  }

  render() {
    const container = document.getElementById('education-content');
    if (!container) return;
    
    container.innerHTML = this.content.map(item => `
      <div class="education-card" data-id="${item.id}">
        <h3>${item.title}</h3>
        <span class="category">${item.category}</span>
        <p>${item.content.substring(0, 150)}...</p>
        <button class="btn btn-outline learn-more" data-id="${item.id}">
          Learn More
        </button>
      </div>
    `).join('');
    
    // Add event listeners
    document.querySelectorAll('.learn-more').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.target.dataset.id;
        this.showContent(id);
      });
    });
  }

  showContent(id) {
    const content = this.content.find(item => item.id === id);
    if (!content) return;
    
    const modal = document.createElement('div');
    modal.className = 'education-modal';
    modal.innerHTML = `
      <div class="modal-overlay">
        <div class="modal-content">
          <h2>${content.title}</h2>
          <div class="education-content">
            <p>${content.content}</p>
            ${content.videos ? `
              <div class="video-container">
                <iframe src="${content.videos[0]}" frameborder="0" allowfullscreen></iframe>
              </div>
            ` : ''}
          </div>
          <button class="btn btn-primary close-education">Close</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    modal.querySelector('.close-education').addEventListener('click', () => {
      modal.remove();
    });
  }
}
