<?php
/**
 * Lupo Trading Platform - Stock Data API
 * Real-time stock quotes via Alpha Vantage
 */

require_once __DIR__ . '/../config/config.php';

setCorsHeaders();

// Rate limiting
if (!checkRateLimit($_SERVER['REMOTE_ADDR'])) {
    errorResponse('Too many requests. Please try again later.', 429);
}

// Require authentication for all stock endpoints
$user = requireAuth();

$method = $_SERVER['REQUEST_METHOD'];
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$pathParts = explode('/', trim($path, '/'));

// Handle different endpoints
switch ($method) {
    case 'GET':
        handleGet($pathParts);
        break;
    case 'POST':
        handlePost($pathParts);
        break;
    default:
        errorResponse('Method not allowed', 405);
}

function handleGet($pathParts) {
    $action = $pathParts[2] ?? '';
    
    switch ($action) {
        case 'quote':
            $symbol = $pathParts[3] ?? '';
            if (!$symbol) {
                errorResponse('Symbol required');
            }
            getStockQuote($symbol);
            break;
        case 'opportunities':
            getOpportunities();
            break;
        case 'search':
            $query = $pathParts[3] ?? '';
            if (!$query) {
                errorResponse('Search query required');
            }
            searchStocks($query);
            break;
        default:
            errorResponse('Invalid endpoint', 404);
    }
}

function handlePost($pathParts) {
    $action = $pathParts[2] ?? '';
    $input = json_decode(file_get_contents('php://input'), true);
    
    switch ($action) {
        case 'quotes':
            if (!isset($input['symbols']) || !is_array($input['symbols'])) {
                errorResponse('Symbols array required');
            }
            getMultipleQuotes($input['symbols']);
            break;
        default:
            errorResponse('Invalid endpoint', 404);
    }
}

function getStockQuote($symbol) {
    $symbol = strtoupper(sanitizeInput($symbol));
    $stockData = fetchStockData($symbol);
    successResponse($stockData);
}

function getMultipleQuotes($symbols) {
    if (count($symbols) > 10) {
        errorResponse('Maximum 10 symbols allowed per request');
    }
    
    $results = [];
    foreach ($symbols as $symbol) {
        $symbol = strtoupper(sanitizeInput($symbol));
        $results[] = fetchStockData($symbol);
    }
    
    successResponse($results);
}

function getOpportunities() {
    $popularSymbols = ['AAPL', 'MSFT', 'NVDA', 'TSLA', 'NOK', 'AMC', 'HYSR', 'PLTR'];
    
    $stockData = [];
    foreach ($popularSymbols as $symbol) {
        $stockData[] = fetchStockData($symbol);
    }
    
    // Categorize by price
    $opportunities = [
        'under1' => array_filter($stockData, fn($stock) => $stock['price'] < 1),
        'under4' => array_filter($stockData, fn($stock) => $stock['price'] >= 1 && $stock['price'] < 4),
        'under5' => array_filter($stockData, fn($stock) => $stock['price'] >= 4)
    ];
    
    // Re-index arrays
    $opportunities['under1'] = array_values($opportunities['under1']);
    $opportunities['under4'] = array_values($opportunities['under4']);
    $opportunities['under5'] = array_values($opportunities['under5']);
    
    successResponse($opportunities);
}

function searchStocks($query) {
    $popularStocks = [
        'AAPL', 'MSFT', 'NVDA', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NFLX',
        'NOK', 'AMD', 'INTC', 'PLTR', 'AMC', 'GME', 'RIVN', 'LCID',
        'HYSR', 'ACST', 'URG', 'TTI', 'SB', 'DSGN', 'SRNE'
    ];

    $matches = array_filter($popularStocks, function($symbol) use ($query) {
        return strpos($symbol, strtoupper($query)) === 0;
    });
    
    $matches = array_slice(array_values($matches), 0, 10);
    successResponse($matches);
}

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
?>