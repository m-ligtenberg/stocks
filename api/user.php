<?php
/**
 * Lupo Trading Platform - User Management API
 * Portfolio, watchlist, and user data endpoints
 */

require_once __DIR__ . '/../config/config.php';

// Include stock functions
function fetchStockData($symbol) {
    // Check cache first
    $cachedData = getCachedStock($symbol);
    if ($cachedData && isCacheValid($cachedData['cached_at'])) {
        return json_decode($cachedData['data'], true);
    }
    
    // Fetch from Alpha Vantage API
    try {
        $url = ALPHA_VANTAGE_BASE_URL . "?function=GLOBAL_QUOTE&symbol={$symbol}&apikey=" . ALPHA_VANTAGE_API_KEY;
        
        $context = stream_context_create([
            'http' => [
                'timeout' => 10,
                'user_agent' => 'Lupo Trading Platform/1.0'
            ]
        ]);
        
        $response = file_get_contents($url, false, $context);
        
        if ($response === false) {
            throw new Exception("Failed to fetch data for {$symbol}");
        }
        
        $data = json_decode($response, true);
        
        if (isset($data['Global Quote']) && !empty($data['Global Quote'])) {
            $stockData = parseAlphaVantageQuote($data['Global Quote'], $symbol);
            cacheStockData($symbol, $stockData);
            return $stockData;
        } else {
            throw new Exception("No data returned for {$symbol}");
        }
        
    } catch (Exception $e) {
        error_log("Stock fetch error for {$symbol}: " . $e->getMessage());
        return getDemoStockData($symbol);
    }
}

function getCachedStock($symbol) {
    $db = new Database();
    $conn = $db->getConnection();
    
    try {
        $stmt = $conn->prepare("SELECT data, cached_at FROM stock_cache WHERE symbol = ?");
        $stmt->execute([$symbol]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    } catch (PDOException $e) {
        error_log("Cache fetch error: " . $e->getMessage());
        return null;
    }
}

function cacheStockData($symbol, $data) {
    $db = new Database();
    $conn = $db->getConnection();
    
    try {
        $stmt = $conn->prepare("
            INSERT OR REPLACE INTO stock_cache (symbol, data, cached_at) 
            VALUES (?, ?, CURRENT_TIMESTAMP)
        ");
        $stmt->execute([$symbol, json_encode($data)]);
    } catch (PDOException $e) {
        error_log("Cache store error: " . $e->getMessage());
    }
}

function isCacheValid($cachedAt) {
    $cacheTime = strtotime($cachedAt);
    $now = time();
    $cacheAge = $now - $cacheTime;
    return $cacheAge < 300; // 5 minutes
}

function parseAlphaVantageQuote($quote, $symbol) {
    $price = floatval($quote['05. price']);
    $change = floatval($quote['09. change']);
    $changePercent = floatval(str_replace('%', '', $quote['10. change percent']));
    
    return [
        'symbol' => $symbol,
        'name' => getCompanyName($symbol),
        'price' => $price,
        'change' => $change,
        'changePercent' => $changePercent,
        'volume' => intval($quote['06. volume']),
        'lastUpdated' => $quote['07. latest trading day'],
        'opportunity' => getOpportunityCategory($price)
    ];
}

function getDemoStockData($symbol) {
    $demoData = [
        'AAPL' => ['name' => 'Apple Inc', 'basePrice' => 175.50],
        'MSFT' => ['name' => 'Microsoft Corp', 'basePrice' => 378.85],
        'NVDA' => ['name' => 'NVIDIA Corp', 'basePrice' => 875.28],
        'TSLA' => ['name' => 'Tesla Inc', 'basePrice' => 248.50],
        'NOK' => ['name' => 'Nokia Corporation', 'basePrice' => 3.92],
        'HYSR' => ['name' => 'SunHydrogen Inc', 'basePrice' => 0.42],
        'AMC' => ['name' => 'AMC Entertainment', 'basePrice' => 4.25]
    ];

    $stock = $demoData[$symbol] ?? ['name' => "{$symbol} Corporation", 'basePrice' => rand(10, 100)];
    $change = (mt_rand() / mt_getrandmax() - 0.5) * 10;
    $price = max(0.01, $stock['basePrice'] + $change);
    
    return [
        'symbol' => $symbol,
        'name' => $stock['name'],
        'price' => round($price, 2),
        'change' => round($change, 2),
        'changePercent' => round(($change / $stock['basePrice']) * 100, 2),
        'volume' => rand(1000000, 10000000),
        'lastUpdated' => date('Y-m-d'),
        'opportunity' => getOpportunityCategory($price)
    ];
}

function getCompanyName($symbol) {
    $companyNames = [
        'AAPL' => 'Apple Inc',
        'MSFT' => 'Microsoft Corp',
        'NVDA' => 'NVIDIA Corp',
        'AMZN' => 'Amazon.com Inc',
        'TSLA' => 'Tesla Inc',
        'GOOGL' => 'Alphabet Inc',
        'META' => 'Meta Platforms',
        'NOK' => 'Nokia Corporation',
        'AMD' => 'Advanced Micro Devices',
        'INTC' => 'Intel Corporation',
        'HYSR' => 'SunHydrogen Inc',
        'AMC' => 'AMC Entertainment Holdings',
        'GME' => 'GameStop Corp',
        'PLTR' => 'Palantir Technologies',
        'RIVN' => 'Rivian Automotive'
    ];
    return $companyNames[$symbol] ?? "{$symbol} Corporation";
}

function getOpportunityCategory($price) {
    if ($price < 1) return "Micro-Cap Value";
    if ($price < 5) return "Small-Cap Growth";
    if ($price < 50) return "Mid-Cap Opportunity";
    return "Large-Cap Investment";
}

setCorsHeaders();

// Rate limiting
if (!checkRateLimit($_SERVER['REMOTE_ADDR'])) {
    errorResponse('Too many requests. Please try again later.', 429);
}

// Require authentication for all user endpoints
$user = requireAuth();

$method = $_SERVER['REQUEST_METHOD'];
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$pathParts = explode('/', trim($path, '/'));

// Handle different endpoints
switch ($method) {
    case 'GET':
        handleGet($pathParts, $user);
        break;
    case 'POST':
        handlePost($pathParts, $user);
        break;
    case 'DELETE':
        handleDelete($pathParts, $user);
        break;
    default:
        errorResponse('Method not allowed', 405);
}

function handleGet($pathParts, $user) {
    $action = $pathParts[2] ?? '';
    
    switch ($action) {
        case 'profile':
            getUserProfile($user);
            break;
        case 'watchlist':
            getUserWatchlist($user);
            break;
        case 'portfolio':
            getUserPortfolio($user);
            break;
        case 'transactions':
            getUserTransactions($user);
            break;
        default:
            errorResponse('Invalid endpoint', 404);
    }
}

function handlePost($pathParts, $user) {
    $action = $pathParts[2] ?? '';
    $input = json_decode(file_get_contents('php://input'), true);
    
    switch ($action) {
        case 'watchlist':
            addToWatchlist($user, $input);
            break;
        case 'portfolio':
            $subAction = $pathParts[3] ?? '';
            if ($subAction === 'trade') {
                executeTrade($user, $input);
            } elseif ($subAction === 'reset') {
                resetPortfolio($user);
            } else {
                errorResponse('Invalid portfolio action', 404);
            }
            break;
        default:
            errorResponse('Invalid endpoint', 404);
    }
}

function handleDelete($pathParts, $user) {
    $action = $pathParts[2] ?? '';
    
    switch ($action) {
        case 'watchlist':
            $symbol = $pathParts[3] ?? '';
            if (!$symbol) {
                errorResponse('Symbol required');
            }
            removeFromWatchlist($user, $symbol);
            break;
        default:
            errorResponse('Invalid endpoint', 404);
    }
}

function getUserProfile($user) {
    $db = new Database();
    $conn = $db->getConnection();
    
    try {
        $stmt = $conn->prepare("
            SELECT id, email, first_name, last_name, avatar_url, created_at
            FROM users WHERE id = ?
        ");
        $stmt->execute([$user['userId']]);
        $profile = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($profile) {
            successResponse($profile);
        } else {
            errorResponse('User not found', 404);
        }
    } catch (PDOException $e) {
        error_log("Profile fetch error: " . $e->getMessage());
        errorResponse('Failed to fetch profile', 500);
    }
}

function getUserWatchlist($user) {
    $db = new Database();
    $conn = $db->getConnection();
    
    try {
        $stmt = $conn->prepare("
            SELECT symbol, name, added_at
            FROM user_watchlists 
            WHERE user_id = ?
            ORDER BY added_at DESC
        ");
        $stmt->execute([$user['userId']]);
        $watchlist = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Fetch live data for each stock
        $enrichedWatchlist = [];
        foreach ($watchlist as $stock) {
            $stockData = fetchStockData($stock['symbol']);
            $stockData['addedAt'] = $stock['added_at'];
            $enrichedWatchlist[] = $stockData;
        }
        
        successResponse($enrichedWatchlist);
    } catch (PDOException $e) {
        error_log("Watchlist fetch error: " . $e->getMessage());
        errorResponse('Failed to fetch watchlist', 500);
    }
}

function addToWatchlist($user, $input) {
    if (!isset($input['symbol'])) {
        errorResponse('Symbol required');
    }
    
    $symbol = strtoupper(sanitizeInput($input['symbol']));
    
    // Fetch stock data to get company name
    $stockData = fetchStockData($symbol);
    
    $db = new Database();
    $conn = $db->getConnection();
    
    try {
        $stmt = $conn->prepare("
            INSERT OR IGNORE INTO user_watchlists (user_id, symbol, name)
            VALUES (?, ?, ?)
        ");
        $stmt->execute([$user['userId'], $symbol, $stockData['name']]);
        
        if ($stmt->rowCount() > 0) {
            successResponse(['symbol' => $symbol], 'Stock added to watchlist');
        } else {
            errorResponse('Stock already in watchlist', 409);
        }
    } catch (PDOException $e) {
        error_log("Watchlist add error: " . $e->getMessage());
        errorResponse('Failed to add stock to watchlist', 500);
    }
}

function removeFromWatchlist($user, $symbol) {
    $symbol = strtoupper(sanitizeInput($symbol));
    
    $db = new Database();
    $conn = $db->getConnection();
    
    try {
        $stmt = $conn->prepare("
            DELETE FROM user_watchlists 
            WHERE user_id = ? AND symbol = ?
        ");
        $stmt->execute([$user['userId'], $symbol]);
        
        if ($stmt->rowCount() > 0) {
            successResponse(['symbol' => $symbol], 'Stock removed from watchlist');
        } else {
            errorResponse('Stock not found in watchlist', 404);
        }
    } catch (PDOException $e) {
        error_log("Watchlist remove error: " . $e->getMessage());
        errorResponse('Failed to remove stock from watchlist', 500);
    }
}

function getUserPortfolio($user) {
    $db = new Database();
    $conn = $db->getConnection();
    
    try {
        // Get portfolio summary
        $stmt = $conn->prepare("
            SELECT cash_balance, total_value, updated_at
            FROM user_portfolios WHERE user_id = ?
        ");
        $stmt->execute([$user['userId']]);
        $portfolio = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$portfolio) {
            errorResponse('Portfolio not found', 404);
        }
        
        // Get holdings
        $stmt = $conn->prepare("
            SELECT symbol, name, shares, average_cost, current_price, last_updated
            FROM user_holdings 
            WHERE user_id = ? AND shares > 0
            ORDER BY symbol
        ");
        $stmt->execute([$user['userId']]);
        $holdings = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Update current prices and calculate P&L
        $totalValue = $portfolio['cash_balance'];
        $totalGainLoss = 0;
        
        foreach ($holdings as &$holding) {
            $stockData = fetchStockData($holding['symbol']);
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
            updateHoldingPrice($user['userId'], $holding['symbol'], $holding['current_price']);
        }
        
        // Update portfolio total value
        updatePortfolioValue($user['userId'], $totalValue);
        
        $portfolio['total_value'] = round($totalValue, 2);
        $portfolio['total_gain_loss'] = round($totalGainLoss, 2);
        $portfolio['total_gain_loss_percent'] = $portfolio['cash_balance'] > 0 ? 
            round(($totalGainLoss / 10000) * 100, 2) : 0;
        $portfolio['holdings'] = $holdings;
        
        successResponse($portfolio);
    } catch (PDOException $e) {
        error_log("Portfolio fetch error: " . $e->getMessage());
        errorResponse('Failed to fetch portfolio', 500);
    }
}

function executeTrade($user, $input) {
    $required = ['symbol', 'type', 'shares'];
    $missing = validateRequired($input, $required);
    
    if (!empty($missing)) {
        errorResponse('Missing required fields: ' . implode(', ', $missing));
    }
    
    $symbol = strtoupper(sanitizeInput($input['symbol']));
    $type = sanitizeInput($input['type']);
    $shares = floatval($input['shares']);
    
    if (!in_array($type, ['buy', 'sell'])) {
        errorResponse('Invalid trade type. Must be buy or sell');
    }
    
    if ($shares <= 0) {
        errorResponse('Shares must be greater than 0');
    }
    
    // Get current stock price
    $stockData = fetchStockData($symbol);
    $price = $stockData['price'];
    $totalAmount = $shares * $price;
    
    $db = new Database();
    $conn = $db->getConnection();
    
    try {
        $conn->beginTransaction();
        
        // Get current portfolio
        $stmt = $conn->prepare("SELECT cash_balance FROM user_portfolios WHERE user_id = ?");
        $stmt->execute([$user['userId']]);
        $portfolio = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$portfolio) {
            throw new Exception('Portfolio not found');
        }
        
        if ($type === 'buy') {
            // Check if user has enough cash
            if ($portfolio['cash_balance'] < $totalAmount) {
                throw new Exception('Insufficient funds');
            }
            
            // Update or create holding
            $stmt = $conn->prepare("
                SELECT shares, average_cost FROM user_holdings 
                WHERE user_id = ? AND symbol = ?
            ");
            $stmt->execute([$user['userId'], $symbol]);
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
                $stmt->execute([$newShares, $newAverageCost, $price, $user['userId'], $symbol]);
            } else {
                // Create new holding
                $stmt = $conn->prepare("
                    INSERT INTO user_holdings (user_id, symbol, name, shares, average_cost, current_price)
                    VALUES (?, ?, ?, ?, ?, ?)
                ");
                $stmt->execute([$user['userId'], $symbol, $stockData['name'], $shares, $price, $price]);
            }
            
            // Update cash balance
            $newCashBalance = $portfolio['cash_balance'] - $totalAmount;
            
        } else { // sell
            // Check if user has enough shares
            $stmt = $conn->prepare("
                SELECT shares FROM user_holdings 
                WHERE user_id = ? AND symbol = ?
            ");
            $stmt->execute([$user['userId'], $symbol]);
            $holding = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$holding || $holding['shares'] < $shares) {
                throw new Exception('Insufficient shares');
            }
            
            // Update holding
            $newShares = $holding['shares'] - $shares;
            
            if ($newShares > 0) {
                $stmt = $conn->prepare("
                    UPDATE user_holdings 
                    SET shares = ?, current_price = ?, last_updated = CURRENT_TIMESTAMP
                    WHERE user_id = ? AND symbol = ?
                ");
                $stmt->execute([$newShares, $price, $user['userId'], $symbol]);
            } else {
                // Remove holding if all shares sold
                $stmt = $conn->prepare("
                    DELETE FROM user_holdings 
                    WHERE user_id = ? AND symbol = ?
                ");
                $stmt->execute([$user['userId'], $symbol]);
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
        $stmt->execute([$newCashBalance, $user['userId']]);
        
        // Record transaction
        $stmt = $conn->prepare("
            INSERT INTO transactions (user_id, symbol, name, type, shares, price, total_amount)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([$user['userId'], $symbol, $stockData['name'], $type, $shares, $price, $totalAmount]);
        
        $conn->commit();
        
        successResponse([
            'symbol' => $symbol,
            'type' => $type,
            'shares' => $shares,
            'price' => $price,
            'total_amount' => $totalAmount
        ], 'Trade executed successfully');
        
    } catch (Exception $e) {
        $conn->rollback();
        error_log("Trade execution error: " . $e->getMessage());
        errorResponse($e->getMessage(), 400);
    } catch (PDOException $e) {
        $conn->rollback();
        error_log("Trade database error: " . $e->getMessage());
        errorResponse('Trade execution failed', 500);
    }
}

function resetPortfolio($user) {
    $db = new Database();
    $conn = $db->getConnection();
    
    try {
        $conn->beginTransaction();
        
        // Clear holdings
        $stmt = $conn->prepare("DELETE FROM user_holdings WHERE user_id = ?");
        $stmt->execute([$user['userId']]);
        
        // Clear transactions
        $stmt = $conn->prepare("DELETE FROM transactions WHERE user_id = ?");
        $stmt->execute([$user['userId']]);
        
        // Reset portfolio
        $stmt = $conn->prepare("
            UPDATE user_portfolios 
            SET cash_balance = 10000.00, total_value = 10000.00, updated_at = CURRENT_TIMESTAMP
            WHERE user_id = ?
        ");
        $stmt->execute([$user['userId']]);
        
        $conn->commit();
        
        successResponse(['cash_balance' => 10000.00], 'Portfolio reset successfully');
        
    } catch (PDOException $e) {
        $conn->rollback();
        error_log("Portfolio reset error: " . $e->getMessage());
        errorResponse('Failed to reset portfolio', 500);
    }
}

function getUserTransactions($user) {
    $db = new Database();
    $conn = $db->getConnection();
    
    try {
        $stmt = $conn->prepare("
            SELECT symbol, name, type, shares, price, total_amount, fees, executed_at
            FROM transactions
            WHERE user_id = ?
            ORDER BY executed_at DESC
            LIMIT 100
        ");
        $stmt->execute([$user['userId']]);
        $transactions = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        successResponse($transactions);
    } catch (PDOException $e) {
        error_log("Transactions fetch error: " . $e->getMessage());
        errorResponse('Failed to fetch transactions', 500);
    }
}

function updateHoldingPrice($userId, $symbol, $price) {
    $db = new Database();
    $conn = $db->getConnection();
    
    try {
        $stmt = $conn->prepare("
            UPDATE user_holdings 
            SET current_price = ?, last_updated = CURRENT_TIMESTAMP
            WHERE user_id = ? AND symbol = ?
        ");
        $stmt->execute([$price, $userId, $symbol]);
    } catch (PDOException $e) {
        error_log("Price update error: " . $e->getMessage());
    }
}

function updatePortfolioValue($userId, $totalValue) {
    $db = new Database();
    $conn = $db->getConnection();
    
    try {
        $stmt = $conn->prepare("
            UPDATE user_portfolios 
            SET total_value = ?, updated_at = CURRENT_TIMESTAMP
            WHERE user_id = ?
        ");
        $stmt->execute([$totalValue, $userId]);
    } catch (PDOException $e) {
        error_log("Portfolio value update error: " . $e->getMessage());
    }
}
?>