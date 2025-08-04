<?php
/**
 * Lupo Trading Platform - Authentication API
 * Secure user registration and login
 */

require_once __DIR__ . '/../config/config.php';

setCorsHeaders();

// Rate limiting
if (!checkRateLimit($_SERVER['REMOTE_ADDR'])) {
    errorResponse('Too many requests. Please try again later.', 429);
}

$method = $_SERVER['REQUEST_METHOD'];
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$pathParts = explode('/', trim($path, '/'));

// Get the action from URL (e.g., /api/auth/login)
$action = end($pathParts);

switch ($method) {
    case 'POST':
        handlePost($action);
        break;
    default:
        errorResponse('Method not allowed', 405);
}

function handlePost($action) {
    $input = json_decode(file_get_contents('php://input'), true);
    
    // Verify endpoint doesn't need JSON payload
    if ($action !== 'verify' && !$input) {
        errorResponse('Invalid JSON payload');
    }
    
    switch ($action) {
        case 'register':
            registerUser($input);
            break;
        case 'login':
            loginUser($input);
            break;
        case 'verify':
            verifyToken();
            break;
        default:
            errorResponse('Invalid endpoint', 404);
    }
}

function registerUser($input) {
    $required = ['email', 'password'];
    $missing = validateRequired($input, $required);
    
    if (!empty($missing)) {
        errorResponse('Missing required fields: ' . implode(', ', $missing));
    }
    
    $email = sanitizeInput($input['email']);
    $password = $input['password'];
    $firstName = sanitizeInput($input['firstName'] ?? '');
    $lastName = sanitizeInput($input['lastName'] ?? '');
    
    // Validate email
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        errorResponse('Invalid email format');
    }
    
    // Validate password
    if (strlen($password) < 6) {
        errorResponse('Password must be at least 6 characters long');
    }
    
    $db = new Database();
    $conn = $db->getConnection();
    
    try {
        // Check if user exists
        $stmt = $conn->prepare("SELECT id FROM users WHERE email = ?");
        $stmt->execute([$email]);
        
        if ($stmt->fetch()) {
            errorResponse('User with this email already exists', 409);
        }
        
        // Hash password
        $passwordHash = password_hash($password, PASSWORD_DEFAULT);
        
        // Create user
        $conn->beginTransaction();
        
        $stmt = $conn->prepare("
            INSERT INTO users (email, password_hash, first_name, last_name) 
            VALUES (?, ?, ?, ?)
        ");
        $stmt->execute([$email, $passwordHash, $firstName, $lastName]);
        
        $userId = $conn->lastInsertId();
        
        // Create portfolio
        $stmt = $conn->prepare("
            INSERT INTO user_portfolios (user_id, cash_balance, total_value) 
            VALUES (?, ?, ?)
        ");
        $stmt->execute([$userId, 10000.00, 10000.00]);
        
        $conn->commit();
        
        // Generate JWT
        $token = generateJWT([
            'userId' => $userId,
            'email' => $email,
            'exp' => time() + SESSION_LIFETIME
        ]);
        
        successResponse([
            'user' => [
                'id' => $userId,
                'email' => $email,
                'firstName' => $firstName,
                'lastName' => $lastName
            ],
            'token' => $token
        ], 'User registered successfully');
        
    } catch (PDOException $e) {
        $conn->rollback();
        error_log("Registration error: " . $e->getMessage());
        errorResponse('Registration failed', 500);
    }
}

function loginUser($input) {
    $required = ['email', 'password'];
    $missing = validateRequired($input, $required);
    
    if (!empty($missing)) {
        errorResponse('Missing required fields: ' . implode(', ', $missing));
    }
    
    $email = sanitizeInput($input['email']);
    $password = $input['password'];
    
    $db = new Database();
    $conn = $db->getConnection();
    
    try {
        $stmt = $conn->prepare("
            SELECT id, email, password_hash, first_name, last_name 
            FROM users WHERE email = ?
        ");
        $stmt->execute([$email]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$user || !password_verify($password, $user['password_hash'])) {
            errorResponse('Invalid credentials', 401);
        }
        
        // Generate JWT
        $token = generateJWT([
            'userId' => $user['id'],
            'email' => $user['email'],
            'exp' => time() + SESSION_LIFETIME
        ]);
        
        successResponse([
            'user' => [
                'id' => $user['id'],
                'email' => $user['email'],
                'firstName' => $user['first_name'],
                'lastName' => $user['last_name']
            ],
            'token' => $token
        ], 'Login successful');
        
    } catch (PDOException $e) {
        error_log("Login error: " . $e->getMessage());
        errorResponse('Login failed', 500);
    }
}

function verifyToken() {
    $payload = requireAuth();
    
    successResponse([
        'valid' => true,
        'user' => [
            'id' => $payload['userId'],
            'email' => $payload['email']
        ]
    ]);
}
?>