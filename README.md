# Lupo Trading Platform

> **Transparent. Independent. Retail-Focused.**

A professional trading platform that empowers retail investors through market transparency, real-time data, and educational tools.

## 🚀 Features

### ✅ **Phase 1: Complete**
- **Live Stock Data** - Real-time prices via Alpha Vantage API
- **User Authentication** - Secure JWT-based login system
- **Personal Watchlist** - Track your favorite stocks
- **Portfolio Simulation** - Practice trading with $10,000 virtual cash
- **Transaction History** - Complete trading records
- **Professional UI** - Dark theme with responsive design

### 🔄 **Coming Soon**
- **Wall Street Transparency** - Dark pool & institutional data
- **Educational Content** - Market mechanics tutorials
- **Advanced Analytics** - Technical indicators & correlation analysis

## 🛠️ Setup Instructions

### Prerequisites
- Node.js 16+ 
- npm or yarn

### Installation

1. **Clone and navigate to the project:**
   ```bash
   cd Lupo
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the server:**
   ```bash
   npm start
   ```
   
   Or for development with auto-reload:
   ```bash
   npm run dev
   ```

4. **Open your browser:**
   ```
   http://localhost:3000
   ```

### Demo Login
- **Email:** demo@lupo.com
- **Password:** demo123

## 📊 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `POST /api/auth/verify` - Verify JWT token

### Stock Data
- `GET /api/stocks/quote/:symbol` - Get single stock quote
- `POST /api/stocks/quotes` - Get multiple stock quotes
- `GET /api/stocks/opportunities` - Get categorized stock opportunities
- `GET /api/stocks/search/:query` - Search stock symbols

### User Data
- `GET /api/user/profile` - Get user profile
- `GET /api/user/watchlist` - Get user watchlist
- `POST /api/user/watchlist` - Add stock to watchlist
- `DELETE /api/user/watchlist/:symbol` - Remove from watchlist
- `GET /api/user/portfolio` - Get portfolio with P&L
- `POST /api/user/portfolio/trade` - Execute buy/sell orders
- `POST /api/user/portfolio/reset` - Reset portfolio to $10,000
- `GET /api/user/transactions` - Get transaction history

## 🔧 Architecture

### Backend
- **Express.js** - Web framework
- **SQLite** - Lightweight database
- **JWT** - Secure authentication  
- **bcrypt** - Password hashing
- **Helmet** - Security headers
- **Rate Limiting** - API protection

### Frontend
- **Vanilla JavaScript** - No frameworks, pure performance
- **Chart.js** - Financial data visualization
- **CSS Variables** - Professional design system
- **Responsive Design** - Mobile-first approach

### Database Schema
- **users** - User accounts and profiles
- **user_portfolios** - Portfolio summaries
- **user_watchlists** - Personal stock watchlists
- **user_holdings** - Current stock positions
- **transactions** - Complete trading history
- **stock_cache** - API response caching

## 🔐 Security Features

- **JWT Authentication** - Stateless, secure tokens
- **Password Hashing** - bcrypt with 12 rounds
- **Rate Limiting** - 100 requests per 15 minutes
- **Helmet.js** - Security headers and CSP
- **SQL Injection Protection** - Parameterized queries
- **CORS Configuration** - Controlled cross-origin access

## 🌱 Environment Variables

Create a `.env` file (already included):

```env
PORT=3000
NODE_ENV=development
JWT_SECRET=your_super_secret_key
ALPHA_VANTAGE_API_KEY=your_api_key
DATABASE_URL=./lupo.db
BCRYPT_ROUNDS=12
JWT_EXPIRES_IN=7d
```

## 📈 Data Sources

- **Alpha Vantage API** - Real-time stock data
- **Demo Data Fallback** - When API limits are reached
- **5-minute Caching** - Efficient API usage

## 🎯 Trading Features

### Portfolio Management
- **$10,000 Starting Balance** - Practice with virtual money
- **Real-time P&L Tracking** - See gains/losses instantly
- **Position Management** - Buy/sell with live prices
- **Cost Basis Calculation** - Weighted average tracking
- **Transaction History** - Complete audit trail

### Risk Management
- **Insufficient Funds Check** - Can't spend more than you have
- **Share Validation** - Can't sell more than you own
- **Database Transactions** - ACID compliance for trades
- **Error Handling** - Graceful failure recovery

## 🚀 Deployment

### Local Development
```bash
npm run dev
```

### Production
```bash
NODE_ENV=production npm start
```

### Docker (Future)
```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests (coming soon)
5. Submit a pull request

## 📝 License

MIT License - Build amazing things!

## 📞 Support

- **Issues:** Open a GitHub issue
- **Email:** support@lupo.com (demo)
- **Docs:** Check the API endpoints above

---

**Built with ❤️ for retail investors everywhere**

*Empowering transparency in financial markets*