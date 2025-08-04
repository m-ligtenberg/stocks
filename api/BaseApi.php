<?php
/**
 * Base API Class
 * Standardized API functionality with consistent error handling and responses
 */

abstract class BaseApi {
    protected $db;
    protected $user;
    protected $rateLimiter;
    
    public function __construct() {
        $this->db = new Database();
        $this->rateLimiter = new RateLimiter();
        $this->initializeApi();
    }
    
    /**
     * Initialize API with common setup
     */
    protected function initializeApi() {
        setCorsHeaders();
        
        // Rate limiting check
        if (!$this->rateLimiter->checkLimit($_SERVER['REMOTE_ADDR'])) {
            $this->errorResponse('Too many requests. Please try again later.', 429);
        }
        
        // Authentication check (can be overridden)
        if ($this->requiresAuth()) {
            $this->user = requireAuth();
        }
    }
    
    /**
     * Whether this API requires authentication
     * Override in child classes as needed
     */
    protected function requiresAuth() {
        return true;
    }
    
    /**
     * Main request handler
     */
    public function handleRequest() {
        try {
            $method = $_SERVER['REQUEST_METHOD'];
            $path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
            $pathParts = explode('/', trim($path, '/'));
            
            switch ($method) {
                case 'GET':
                    $this->handleGet($pathParts);
                    break;
                case 'POST':
                    $this->handlePost($pathParts);
                    break;
                case 'PUT':
                    $this->handlePut($pathParts);
                    break;
                case 'PATCH':
                    $this->handlePatch($pathParts);
                    break;
                case 'DELETE':
                    $this->handleDelete($pathParts);
                    break;
                default:
                    $this->errorResponse('Method not allowed', 405);
            }
        } catch (ApiException $e) {
            $this->handleApiException($e);
        } catch (ValidationException $e) {
            $this->errorResponse($e->getMessage(), 400);
        } catch (AuthenticationException $e) {
            $this->errorResponse($e->getMessage(), 401);
        } catch (AuthorizationException $e) {
            $this->errorResponse($e->getMessage(), 403);
        } catch (NotFoundException $e) {
            $this->errorResponse($e->getMessage(), 404);
        } catch (Exception $e) {
            error_log("API Error: " . $e->getMessage());
            $this->errorResponse('Internal server error', 500);
        }
    }
    
    /**
     * HTTP method handlers - to be implemented by child classes
     */
    protected function handleGet($pathParts) {
        $this->errorResponse('GET method not implemented', 405);
    }
    
    protected function handlePost($pathParts) {
        $this->errorResponse('POST method not implemented', 405);
    }
    
    protected function handlePut($pathParts) {
        $this->errorResponse('PUT method not implemented', 405);
    }
    
    protected function handlePatch($pathParts) {
        $this->errorResponse('PATCH method not implemented', 405);
    }
    
    protected function handleDelete($pathParts) {
        $this->errorResponse('DELETE method not implemented', 405);
    }
    
    /**
     * Get validated JSON input
     */
    protected function getJsonInput($required = []) {
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (json_last_error() !== JSON_ERROR_NONE) {
            throw new ValidationException('Invalid JSON payload');
        }
        
        if (!empty($required)) {
            $missing = $this->validateRequired($input, $required);
            if (!empty($missing)) {
                throw new ValidationException('Missing required fields: ' . implode(', ', $missing));
            }
        }
        
        return $input;
    }
    
    /**
     * Validate required fields
     */
    protected function validateRequired($data, $fields) {
        $missing = [];
        foreach ($fields as $field) {
            if (!isset($data[$field]) || (is_string($data[$field]) && empty(trim($data[$field])))) {
                $missing[] = $field;
            }
        }
        return $missing;
    }
    
    /**
     * Sanitize input data
     */
    protected function sanitizeInput($input) {
        if (is_array($input)) {
            return array_map([$this, 'sanitizeInput'], $input);
        }
        return htmlspecialchars(strip_tags(trim($input)));
    }
    
    /**
     * Validate email format
     */
    protected function validateEmail($email) {
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            throw new ValidationException('Invalid email format');
        }
        return true;
    }
    
    /**
     * Validate password strength
     */
    protected function validatePassword($password, $minLength = 6) {
        if (strlen($password) < $minLength) {
            throw new ValidationException("Password must be at least {$minLength} characters long");
        }
        return true;
    }
    
    /**
     * Success response helper
     */
    protected function successResponse($data = null, $message = null, $status = 200) {
        $response = [
            'success' => true,
            'timestamp' => date('c')
        ];
        
        if ($message !== null) {
            $response['message'] = $message;
        }
        
        if ($data !== null) {
            $response['data'] = $data;
        }
        
        http_response_code($status);
        header('Content-Type: application/json');
        echo json_encode($response, JSON_PRETTY_PRINT);
        exit();
    }
    
    /**
     * Error response helper
     */
    protected function errorResponse($message, $status = 400, $details = null) {
        $response = [
            'success' => false,
            'error' => $message,
            'timestamp' => date('c')
        ];
        
        if ($details !== null) {
            $response['details'] = $details;
        }
        
        http_response_code($status);
        header('Content-Type: application/json');
        echo json_encode($response, JSON_PRETTY_PRINT);
        exit();
    }
    
    /**
     * Handle API exceptions with proper logging
     */
    protected function handleApiException(ApiException $e) {
        error_log("API Exception: " . $e->getMessage() . " - Code: " . $e->getCode());
        $this->errorResponse($e->getMessage(), $e->getCode(), $e->getDetails());
    }
    
    /**
     * Database transaction wrapper
     */
    protected function executeTransaction(callable $callback) {
        $conn = $this->db->getConnection();
        
        try {
            $conn->beginTransaction();
            $result = $callback($conn);
            $conn->commit();
            return $result;
        } catch (Exception $e) {
            $conn->rollback();
            throw $e;
        }
    }
    
    /**
     * Get paginated results
     */
    protected function paginate($query, $params = [], $page = 1, $limit = 25) {
        $page = max(1, intval($page));
        $limit = min(100, max(1, intval($limit)));
        $offset = ($page - 1) * $limit;
        
        // Get total count
        $countQuery = preg_replace('/SELECT.*?FROM/i', 'SELECT COUNT(*) as total FROM', $query, 1);
        $countQuery = preg_replace('/ORDER BY.*$/i', '', $countQuery);
        
        $stmt = $this->db->getConnection()->prepare($countQuery);
        $stmt->execute($params);
        $total = $stmt->fetch(PDO::FETCH_ASSOC)['total'];
        
        // Get paginated results
        $query .= " LIMIT {$limit} OFFSET {$offset}";
        $stmt = $this->db->getConnection()->prepare($query);
        $stmt->execute($params);
        $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        return [
            'data' => $data,
            'pagination' => [
                'page' => $page,
                'limit' => $limit,
                'total' => intval($total),
                'pages' => ceil($total / $limit)
            ]
        ];
    }
    
    /**
     * Cache data with TTL
     */
    protected function cacheSet($key, $data, $ttl = 300) {
        $cacheDir = __DIR__ . '/../data/cache/';
        if (!is_dir($cacheDir)) {
            mkdir($cacheDir, 0755, true);
        }
        
        $cacheData = [
            'data' => $data,
            'expires' => time() + $ttl
        ];
        
        file_put_contents($cacheDir . md5($key) . '.json', json_encode($cacheData));
    }
    
    /**
     * Get cached data
     */
    protected function cacheGet($key) {
        $cacheFile = __DIR__ . '/../data/cache/' . md5($key) . '.json';
        
        if (!file_exists($cacheFile)) {
            return null;
        }
        
        $cacheData = json_decode(file_get_contents($cacheFile), true);
        
        if ($cacheData['expires'] < time()) {
            unlink($cacheFile);
            return null;
        }
        
        return $cacheData['data'];
    }
    
    /**
     * Get current user ID
     */
    protected function getUserId() {
        return $this->user['userId'] ?? null;
    }
    
    /**
     * Check if user has specific role
     */
    protected function hasRole($role) {
        return isset($this->user['role']) && $this->user['role'] === $role;
    }
}

/**
 * Rate Limiter Class
 */
class RateLimiter {
    private $cacheDir;
    
    public function __construct() {
        $this->cacheDir = __DIR__ . '/../data/rate_limits/';
        if (!is_dir($this->cacheDir)) {
            mkdir($this->cacheDir, 0755, true);
        }
    }
    
    public function checkLimit($identifier, $maxRequests = RATE_LIMIT_REQUESTS, $window = RATE_LIMIT_WINDOW) {
        $cacheFile = $this->cacheDir . md5($identifier) . '.json';
        
        if (!file_exists($cacheFile)) {
            $this->updateCache($cacheFile, 1);
            return true;
        }
        
        $data = json_decode(file_get_contents($cacheFile), true);
        
        if (time() - $data['window_start'] > $window) {
            // Reset window
            $this->updateCache($cacheFile, 1);
            return true;
        }
        
        if ($data['count'] >= $maxRequests) {
            return false;
        }
        
        $this->updateCache($cacheFile, $data['count'] + 1, $data['window_start']);
        return true;
    }
    
    private function updateCache($file, $count, $windowStart = null) {
        $data = [
            'count' => $count,
            'window_start' => $windowStart ?: time()
        ];
        file_put_contents($file, json_encode($data));
    }
}

/**
 * Custom Exception Classes
 */
class ApiException extends Exception {
    private $details;
    
    public function __construct($message, $code = 500, $details = null) {
        parent::__construct($message, $code);
        $this->details = $details;
    }
    
    public function getDetails() {
        return $this->details;
    }
}

class ValidationException extends ApiException {
    public function __construct($message, $details = null) {
        parent::__construct($message, 400, $details);
    }
}

class AuthenticationException extends ApiException {
    public function __construct($message = 'Authentication required', $details = null) {
        parent::__construct($message, 401, $details);
    }
}

class AuthorizationException extends ApiException {
    public function __construct($message = 'Access denied', $details = null) {
        parent::__construct($message, 403, $details);
    }
}

class NotFoundException extends ApiException {
    public function __construct($message = 'Resource not found', $details = null) {
        parent::__construct($message, 404, $details);
    }
}

/**
 * Stock Data Service
 * Centralized stock data fetching with caching
 */
class StockDataService {
    private $db;
    private $cacheTimeout;
    
    public function __construct($cacheTimeout = 300) {
        $this->db = new Database();
        $this->cacheTimeout = $cacheTimeout;
    }
    
    public function getStockData($symbol) {
        $symbol = strtoupper(trim($symbol));
        
        // Check cache first
        $cachedData = $this->getCachedStock($symbol);
        if ($cachedData && $this->isCacheValid($cachedData['cached_at'])) {
            return json_decode($cachedData['data'], true);
        }
        
        // Fetch from API
        try {
            $stockData = $this->fetchFromApi($symbol);
            $this->cacheStockData($symbol, $stockData);
            return $stockData;
        } catch (Exception $e) {
            error_log("Stock fetch error for {$symbol}: " . $e->getMessage());
            return $this->getDemoStockData($symbol);
        }
    }
    
    private function fetchFromApi($symbol) {
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
            return $this->parseAlphaVantageQuote($data['Global Quote'], $symbol);
        } else {
            throw new Exception("No data returned for {$symbol}");
        }
    }
    
    private function getCachedStock($symbol) {
        try {
            $stmt = $this->db->getConnection()->prepare("SELECT data, cached_at FROM stock_cache WHERE symbol = ?");
            $stmt->execute([$symbol]);
            return $stmt->fetch(PDO::FETCH_ASSOC);
        } catch (PDOException $e) {
            error_log("Cache fetch error: " . $e->getMessage());
            return null;
        }
    }
    
    private function cacheStockData($symbol, $data) {
        try {
            $stmt = $this->db->getConnection()->prepare("
                INSERT OR REPLACE INTO stock_cache (symbol, data, cached_at) 
                VALUES (?, ?, CURRENT_TIMESTAMP)
            ");
            $stmt->execute([$symbol, json_encode($data)]);
        } catch (PDOException $e) {
            error_log("Cache store error: " . $e->getMessage());
        }
    }
    
    private function isCacheValid($cachedAt) {
        $cacheTime = strtotime($cachedAt);
        $now = time();
        $cacheAge = $now - $cacheTime;
        return $cacheAge < $this->cacheTimeout;
    }
    
    private function parseAlphaVantageQuote($quote, $symbol) {
        $price = floatval($quote['05. price']);
        $change = floatval($quote['09. change']);
        $changePercent = floatval(str_replace('%', '', $quote['10. change percent']));
        
        return [
            'symbol' => $symbol,
            'name' => $this->getCompanyName($symbol),
            'price' => $price,
            'change' => $change,
            'changePercent' => $changePercent,
            'volume' => intval($quote['06. volume']),
            'lastUpdated' => $quote['07. latest trading day'],
            'opportunity' => $this->getOpportunityCategory($price)
        ];
    }
    
    private function getDemoStockData($symbol) {
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
            'opportunity' => $this->getOpportunityCategory($price)
        ];
    }
    
    private function getCompanyName($symbol) {
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
    
    private function getOpportunityCategory($price) {
        if ($price < 1) return "Micro-Cap Value";
        if ($price < 5) return "Small-Cap Growth";
        if ($price < 50) return "Mid-Cap Opportunity";
        return "Large-Cap Investment";
    }
}
?>