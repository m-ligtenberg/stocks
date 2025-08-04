// In LupoPlatform class
renderPortfolioPerformance() {
  const ctx = document.getElementById('portfolio-chart').getContext('2d');
  
  // Destroy existing chart if any
  if (this.portfolioChart) {
    this.portfolioChart.destroy();
  }
  
  this.portfolioChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: this.portfolioHistory.map(entry => entry.date),
      datasets: [{
        label: 'Portfolio Value',
        data: this.portfolioHistory.map(entry => entry.value),
        borderColor: '#F59E0B',
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        tension: 0.3,
        fill: true
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false }
      },
      scales: {
        y: {
          beginAtZero: false,
          grid: { color: 'rgba(255,255,255,0.1)' }
        },
        x: {
          grid: { display: false }
        }
      }
    }
  });
}

calculatePortfolioValue() {
  let totalValue = 10000; // Starting cash
  Object.keys(this.portfolio).forEach(symbol => {
    const holding = this.portfolio[symbol];
    totalValue += holding.shares * holding.price;
  });
  
  // Add to history
  this.portfolioHistory.push({
    date: new Date().toISOString().split('T')[0],
    value: totalValue
  });
  
  // Keep only 30 days of history
  if (this.portfolioHistory.length > 30) {
    this.portfolioHistory.shift();
  }
  
  // Update UI
  document.getElementById('portfolio-value').textContent = 
    `$${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  
  this.renderPortfolioPerformance();
}
