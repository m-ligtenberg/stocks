<?php
/**
 * Lupo Trading Platform - Main Configuration
 * Secure configuration management
 */

// Error reporting for development
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Session configuration
ini_set('session.cookie_httponly', 1);
ini_set('session.cookie_secure', 1);
ini_set('session.use_only_cookies', 1);

// Start session
session_start();

// Define constants
define('APP_NAME', 'Lupo Trading Platform');
define('APP_VERSION', '1.0.0');
define('BASE_URL', 'http://localhost:8000');

// API Configuration
define('ALPHA_VANTAGE_API_KEY', 'MRUM29SGMJPSAX9M');
define('ALPHA_VANTAGE_BASE_URL', 'https://www.alphavantage.co/query');

// Security settings
define('JWT_SECRET', 'lupo_super_secret_key_change_in_production_2024');
define('PASSWORD_COST', 12);
define('SESSION_LIFETIME', 3600 * 24 * 7); // 7 days

// Rate limiting
define('RATE_LIMIT_REQUESTS', 100);
define('RATE_LIMIT_WINDOW', 900); // 15 minutes

// Database settings
define('DB_TYPE', 'sqlite'); // 'sqlite' or 'mysql'
define('DB_HOST', 'localhost');
define('DB_NAME', 'lupo_trading');
define('DB_USER', 'root');
define('DB_PASS', '');

// Timezone
date_default_timezone_set('America/New_York');

// CORS headers for API
function setCorsHeaders() {
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
    header('Content-Type: application/json');
    
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(200);
        exit();
    }
}

// JSON response helper
function jsonResponse($data, $status = 200) {
    http_response_code($status);
    header('Content-Type: application/json');
    echo json_encode($data);
    exit();
}

// Error response helper
function errorResponse($message, $status = 400) {
    jsonResponse(['error' => $message], $status);
}

// Success response helper
function successResponse($data, $message = null) {
    $response = ['success' => true];
    if ($message) $response['message'] = $message;
    if ($data) $response['data'] = $data;
    jsonResponse($response);
}

// Validate required fields
function validateRequired($data, $fields) {
    $missing = [];
    foreach ($fields as $field) {
        if (!isset($data[$field]) || empty(trim($data[$field]))) {
            $missing[] = $field;
        }
    }
    return $missing;
}

// Sanitize input
function sanitizeInput($input) {
    return htmlspecialchars(strip_tags(trim($input)));
}

// Rate limiting check
function checkRateLimit($ip) {
    $cacheFile = __DIR__ . '/../data/rate_limit_' . md5($ip) . '.json';
    
    if (!file_exists($cacheFile)) {
        file_put_contents($cacheFile, json_encode(['count' => 1, 'time' => time()]));
        return true;
    }
    
    $data = json_decode(file_get_contents($cacheFile), true);
    
    if (time() - $data['time'] > RATE_LIMIT_WINDOW) {
        // Reset window
        file_put_contents($cacheFile, json_encode(['count' => 1, 'time' => time()]));
        return true;
    }
    
    if ($data['count'] >= RATE_LIMIT_REQUESTS) {
        return false;
    }
    
    $data['count']++;
    file_put_contents($cacheFile, json_encode($data));
    return true;
}

// JWT Token functions
function generateJWT($payload) {
    $header = json_encode(['typ' => 'JWT', 'alg' => 'HS256']);
    $payload = json_encode($payload);
    
    $headerEncoded = base64url_encode($header);
    $payloadEncoded = base64url_encode($payload);
    
    $signature = hash_hmac('sha256', $headerEncoded . "." . $payloadEncoded, JWT_SECRET, true);
    $signatureEncoded = base64url_encode($signature);
    
    return $headerEncoded . "." . $payloadEncoded . "." . $signatureEncoded;
}

function verifyJWT($jwt) {
    $parts = explode('.', $jwt);
    if (count($parts) !== 3) {
        return false;
    }
    
    $header = $parts[0];
    $payload = $parts[1];
    $signature = $parts[2];
    
    $expectedSignature = base64url_encode(
        hash_hmac('sha256', $header . "." . $payload, JWT_SECRET, true)
    );
    
    if ($signature !== $expectedSignature) {
        return false;
    }
    
    $payloadData = json_decode(base64url_decode($payload), true);
    
    // Check expiration
    if (isset($payloadData['exp']) && $payloadData['exp'] < time()) {
        return false;
    }
    
    return $payloadData;
}

function base64url_encode($data) {
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

function base64url_decode($data) {
    return base64_decode(str_pad(strtr($data, '-_', '+/'), strlen($data) % 4, '=', STR_PAD_RIGHT));
}

// Authentication middleware
function requireAuth() {
    $headers = getallheaders();
    $authHeader = $headers['Authorization'] ?? '';
    
    if (!$authHeader || !preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
        errorResponse('Authorization header required', 401);
    }
    
    $token = $matches[1];
    $payload = verifyJWT($token);
    
    if (!$payload) {
        errorResponse('Invalid or expired token', 401);
    }
    
    return $payload;
}

// Initialize database
require_once __DIR__ . '/database.php';
$db = new Database();
$db->initializeTables();
$db->createDemoUser();
?>