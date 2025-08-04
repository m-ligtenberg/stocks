<?php
/**
 * Lupo Trading Platform - User Management API
 * Portfolio, watchlist, and user data endpoints
 */

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/BaseApi.php';

class UserApi extends BaseApi {
    private $stockService;
    
    public function __construct() {
        parent::__construct();
        $this->stockService = new StockDataService();
    }
    
    protected function handleGet($pathParts) {
        $action = $pathParts[2] ?? '';
        
        switch ($action) {
            case 'profile':
                $this->getUserProfile();
                break;
            case 'watchlist':
                $this->getUserWatchlist();
                break;
            case 'portfolio':
                $this->getUserPortfolio();
                break;
            case 'transactions':
                $page = $_GET['page'] ?? 1;
                $limit = $_GET['limit'] ?? 25;
                $this->getUserTransactions($page, $limit);
                break;
            default:
                throw new NotFoundException('Invalid endpoint');
        }
    }
    
    protected function handlePost($pathParts) {
        $action = $pathParts[2] ?? '';
        
        switch ($action) {
            case 'watchlist':
                $this->addToWatchlist();
                break;
            case 'portfolio':
                $subAction = $pathParts[3] ?? '';
                if ($subAction === 'trade') {
                    $this->executeTrade();
                } elseif ($subAction === 'reset') {
                    $this->resetPortfolio();
                } else {
                    throw new NotFoundException('Invalid portfolio action');
                }
                break;
            default:
                throw new NotFoundException('Invalid endpoint');
        }
    }
    
    protected function handleDelete($pathParts) {
        $action = $pathParts[2] ?? '';
        
        switch ($action) {
            case 'watchlist':
                $symbol = $pathParts[3] ?? '';
                if (!$symbol) {
                    throw new ValidationException('Symbol required');
                }
                $this->removeFromWatchlist($symbol);
                break;
            default:
                throw new NotFoundException('Invalid endpoint');
        }
    }
    
    private function getUserProfile() {
        $stmt = $this->db->getConnection()->prepare("
            SELECT id, email, first_name, last_name, avatar_url, created_at
            FROM users WHERE id = ?
        ");
        $stmt->execute([$this->getUserId()]);
        $profile = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$profile) {
            throw new NotFoundException('User not found');
        }
        
        $this->successResponse($profile);
    }
    
    private function getUserWatchlist() {
        $stmt = $this->db->getConnection()->prepare("
            SELECT symbol, name, added_at
            FROM user_watchlists 
            WHERE user_id = ?
            ORDER BY added_at DESC
        ");
        $stmt->execute([$this->getUserId()]);
        $watchlist = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Fetch live data for each stock
        $enrichedWatchlist = [];
        foreach ($watchlist as $stock) {
            $stockData = $this->stockService->getStockData($stock['symbol']);
            $stockData['addedAt'] = $stock['added_at'];
            $enrichedWatchlist[] = $stockData;
        }
        
        $this->successResponse($enrichedWatchlist);
    }
    
    private function addToWatchlist() {
        $input = $this->getJsonInput(['symbol']);
        $symbol = strtoupper($this->sanitizeInput($input['symbol']));
        
        // Fetch stock data to get company name
        $stockData = $this->stockService->getStockData($symbol);
        
        $this->executeTransaction(function($conn) use ($symbol, $stockData) {
            $stmt = $conn->prepare("
                INSERT OR IGNORE INTO user_watchlists (user_id, symbol, name)
                VALUES (?, ?, ?)
            ");
            $stmt->execute([$this->getUserId(), $symbol, $stockData['name']]);
            
            if ($stmt->rowCount() === 0) {
                throw new ValidationException('Stock already in watchlist');
            }
        });
        
        $this->successResponse(['symbol' => $symbol], 'Stock added to watchlist', 201);
    }
    
    private function removeFromWatchlist($symbol) {
        $symbol = strtoupper($this->sanitizeInput($symbol));
        
        $stmt = $this->db->getConnection()->prepare("
            DELETE FROM user_watchlists 
            WHERE user_id = ? AND symbol = ?
        ");
        $stmt->execute([$this->getUserId(), $symbol]);
        
        if ($stmt->rowCount() === 0) {
            throw new NotFoundException('Stock not found in watchlist');
        }
        
        $this->successResponse(['symbol' => $symbol], 'Stock removed from watchlist');
    }
    
    private function getUserPortfolio() {
        // Get portfolio summary
        $stmt = $this->db->getConnection()->prepare("
            SELECT cash_balance, total_value, updated_at
            FROM user_portfolios WHERE user_id = ?
        ");
        $stmt->execute([$this->getUserId()]);
        $portfolio = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$portfolio) {
            throw new NotFoundException('Portfolio not found');
        }
        
        // Get holdings
        $stmt = $this->db->getConnection()->prepare("
            SELECT symbol, name, shares, average_cost, current_price, last_updated
            FROM user_holdings 
            WHERE user_id = ? AND shares > 0
            ORDER BY symbol
        ");
        $stmt->execute([$this->getUserId()]);
        $holdings = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Update current prices and calculate P&L
        $totalValue = $portfolio['cash_balance'];
        $totalGainLoss = 0;
        
        foreach ($holdings as &$holding) {
            $stockData = $this->stockService->getStockData($holding['symbol']);
            $holding['current_price'] = $stockData['price'];
            
            $marketValue = $holding['shares'] * $holding['current_price'];
            $costBasis = $holding['shares'] * $holding['average_cost'];
            $gainLoss = $marketValue - $costBasis;
            $gainLossPercent = $costBasis > 0 ? ($gainLoss / $costBasis) * 100 : 0;
            
            $holding['market_value'] = round($marketValue, 2);
            $holding['cost_basis'] = round($costBasis, 2);
            $holding['gain_loss'] = round($gainLoss, 2);
            $holding['gain_loss_percent'] = round($gainLossPercent, 2);
            
            $totalValue += $marketValue;
            $totalGainLoss += $gainLoss;
            
            // Update current price in database
            $this->updateHoldingPrice($holding['symbol'], $holding['current_price']);
        }
        
        // Update portfolio total value
        $this->updatePortfolioValue($totalValue);
        
        $portfolio['total_value'] = round($totalValue, 2);
        $portfolio['total_gain_loss'] = round($totalGainLoss, 2);
        $portfolio['total_gain_loss_percent'] = $portfolio['cash_balance'] > 0 ? 
            round(($totalGainLoss / 10000) * 100, 2) : 0;
        $portfolio['holdings'] = $holdings;
        
        $this->successResponse($portfolio);
    }
    
    private function executeTrade() {
        $input = $this->getJsonInput(['symbol', 'type', 'shares']);
        
        $symbol = strtoupper($this->sanitizeInput($input['symbol']));
        $type = $this->sanitizeInput($input['type']);
        $shares = floatval($input['shares']);
        
        if (!in_array($type, ['buy', 'sell'])) {
            throw new ValidationException('Invalid trade type. Must be buy or sell');
        }
        
        if ($shares <= 0) {
            throw new ValidationException('Shares must be greater than 0');
        }
        
        // Get current stock price
        $stockData = $this->stockService->getStockData($symbol);
        $price = $stockData['price'];
        $totalAmount = $shares * $price;
        
        $result = $this->executeTransaction(function($conn) use ($symbol, $type, $shares, $price, $totalAmount, $stockData) {
            // Get current portfolio
            $stmt = $conn->prepare("SELECT cash_balance FROM user_portfolios WHERE user_id = ?");
            $stmt->execute([$this->getUserId()]);
            $portfolio = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$portfolio) {
                throw new NotFoundException('Portfolio not found');
            }
            
            if ($type === 'buy') {
                // Check if user has enough cash
                if ($portfolio['cash_balance'] < $totalAmount) {
                    throw new ValidationException('Insufficient funds');
                }
                
                // Update or create holding
                $stmt = $conn->prepare("
                    SELECT shares, average_cost FROM user_holdings 
                    WHERE user_id = ? AND symbol = ?
                ");
                $stmt->execute([$this->getUserId(), $symbol]);
                $holding = $stmt->fetch(PDO::FETCH_ASSOC);
                
                if ($holding) {
                    // Update existing holding
                    $newShares = $holding['shares'] + $shares;
                    $newAverageCost = (($holding['shares'] * $holding['average_cost']) + ($shares * $price)) / $newShares;
                    
                    $stmt = $conn->prepare("
                        UPDATE user_holdings 
                        SET shares = ?, average_cost = ?, current_price = ?, last_updated = CURRENT_TIMESTAMP
                        WHERE user_id = ? AND symbol = ?
                    ");
                    $stmt->execute([$newShares, $newAverageCost, $price, $this->getUserId(), $symbol]);
                } else {
                    // Create new holding
                    $stmt = $conn->prepare("
                        INSERT INTO user_holdings (user_id, symbol, name, shares, average_cost, current_price)
                        VALUES (?, ?, ?, ?, ?, ?)
                    ");
                    $stmt->execute([$this->getUserId(), $symbol, $stockData['name'], $shares, $price, $price]);
                }
                
                // Update cash balance
                $newCashBalance = $portfolio['cash_balance'] - $totalAmount;
                
            } else { // sell
                // Check if user has enough shares
                $stmt = $conn->prepare("
                    SELECT shares FROM user_holdings 
                    WHERE user_id = ? AND symbol = ?
                ");
                $stmt->execute([$this->getUserId(), $symbol]);
                $holding = $stmt->fetch(PDO::FETCH_ASSOC);
                
                if (!$holding || $holding['shares'] < $shares) {
                    throw new ValidationException('Insufficient shares');
                }
                
                // Update holding
                $newShares = $holding['shares'] - $shares;
                
                if ($newShares > 0) {
                    $stmt = $conn->prepare("
                        UPDATE user_holdings 
                        SET shares = ?, current_price = ?, last_updated = CURRENT_TIMESTAMP
                        WHERE user_id = ? AND symbol = ?
                    ");
                    $stmt->execute([$newShares, $price, $this->getUserId(), $symbol]);
                } else {
                    // Remove holding if all shares sold
                    $stmt = $conn->prepare("
                        DELETE FROM user_holdings 
                        WHERE user_id = ? AND symbol = ?
                    ");
                    $stmt->execute([$this->getUserId(), $symbol]);
                }
                
                // Update cash balance
                $newCashBalance = $portfolio['cash_balance'] + $totalAmount;
            }
            
            // Update portfolio cash balance
            $stmt = $conn->prepare("
                UPDATE user_portfolios 
                SET cash_balance = ?, updated_at = CURRENT_TIMESTAMP
                WHERE user_id = ?
            ");
            $stmt->execute([$newCashBalance, $this->getUserId()]);
            
            // Record transaction
            $stmt = $conn->prepare("
                INSERT INTO transactions (user_id, symbol, name, type, shares, price, total_amount)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ");
            $stmt->execute([$this->getUserId(), $symbol, $stockData['name'], $type, $shares, $price, $totalAmount]);
            
            return [
                'symbol' => $symbol,
                'type' => $type,
                'shares' => $shares,
                'price' => $price,
                'total_amount' => $totalAmount
            ];
        });
        
        $this->successResponse($result, 'Trade executed successfully', 201);
    }
    
    private function resetPortfolio() {
        $this->executeTransaction(function($conn) {
            // Clear holdings
            $stmt = $conn->prepare("DELETE FROM user_holdings WHERE user_id = ?");
            $stmt->execute([$this->getUserId()]);
            
            // Clear transactions
            $stmt = $conn->prepare("DELETE FROM transactions WHERE user_id = ?");
            $stmt->execute([$this->getUserId()]);
            
            // Reset portfolio
            $stmt = $conn->prepare("
                UPDATE user_portfolios 
                SET cash_balance = 10000.00, total_value = 10000.00, updated_at = CURRENT_TIMESTAMP
                WHERE user_id = ?
            ");
            $stmt->execute([$this->getUserId()]);
        });
        
        $this->successResponse(['cash_balance' => 10000.00], 'Portfolio reset successfully');
    }
    
    private function getUserTransactions($page = 1, $limit = 25) {
        $result = $this->paginate("
            SELECT symbol, name, type, shares, price, total_amount, fees, executed_at
            FROM transactions
            WHERE user_id = ?
            ORDER BY executed_at DESC
        ", [$this->getUserId()], $page, $limit);
        
        $this->successResponse($result);
    }
    
    private function updateHoldingPrice($symbol, $price) {
        try {
            $stmt = $this->db->getConnection()->prepare("
                UPDATE user_holdings 
                SET current_price = ?, last_updated = CURRENT_TIMESTAMP
                WHERE user_id = ? AND symbol = ?
            ");
            $stmt->execute([$price, $this->getUserId(), $symbol]);
        } catch (PDOException $e) {
            error_log("Price update error: " . $e->getMessage());
        }
    }
    
    private function updatePortfolioValue($totalValue) {
        try {
            $stmt = $this->db->getConnection()->prepare("
                UPDATE user_portfolios 
                SET total_value = ?, updated_at = CURRENT_TIMESTAMP
                WHERE user_id = ?
            ");
            $stmt->execute([$totalValue, $this->getUserId()]);
        } catch (PDOException $e) {
            error_log("Portfolio value update error: " . $e->getMessage());
        }
    }
}

// Initialize and handle request
$api = new UserApi();
$api->handleRequest();
?>