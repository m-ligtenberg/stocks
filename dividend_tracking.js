// In LupoPlatform class
recordDividend(symbol, amount) {
  if (!this.dividends[symbol]) {
    this.dividends[symbol] = [];
  }
  
  this.dividends[symbol].push({
    date: new Date().toISOString().split('T')[0],
    amount
  });
  
  this.cash += amount;
  this.calculatePortfolioValue();
  this.updatePortfolioDisplay();
}

renderDividendHistory() {
  const container = document.getElementById('dividend-history');
  if (!container) return;
  
  let html = '<h3>Dividend History</h3><div class="dividend-list">';
  
  Object.keys(this.dividends).forEach(symbol => {
    this.dividends[symbol].forEach(div => {
      html += `
        <div class="dividend-item">
          <span class="symbol">${symbol}</span>
          <span class="amount">$${div.amount.toFixed(2)}</span>
          <span class="date">${div.date}</span>
        </div>
      `;
    });
  });
  
  html += '</div>';
  container.innerHTML = html;
}
