<?php
/**
 * Lupo Trading Platform - Authentication API
 * Secure user registration and login
 */

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/BaseApi.php';

class AuthApi extends BaseApi {
    
    protected function requiresAuth() {
        // Only verify endpoint requires auth, others are public
        $path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
        return strpos($path, '/verify') !== false;
    }
    
    protected function handlePost($pathParts) {
        $action = end($pathParts);
        
        switch ($action) {
            case 'register':
                $this->registerUser();
                break;
            case 'login':
                $this->loginUser();
                break;
            case 'verify':
                $this->verifyToken();
                break;
            default:
                throw new NotFoundException('Invalid endpoint');
        }
    }
    
    private function registerUser() {
        $input = $this->getJsonInput(['email', 'password']);
        
        $email = $this->sanitizeInput($input['email']);
        $password = $input['password'];
        $firstName = $this->sanitizeInput($input['firstName'] ?? '');
        $lastName = $this->sanitizeInput($input['lastName'] ?? '');
        
        // Validate input
        $this->validateEmail($email);
        $this->validatePassword($password);
        
        $result = $this->executeTransaction(function($conn) use ($email, $password, $firstName, $lastName) {
            // Check if user exists
            $stmt = $conn->prepare("SELECT id FROM users WHERE email = ?");
            $stmt->execute([$email]);
            
            if ($stmt->fetch()) {
                throw new ValidationException('User with this email already exists');
            }
            
            // Hash password
            $passwordHash = password_hash($password, PASSWORD_DEFAULT);
            
            // Create user
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
            
            return $userId;
        });
        
        // Generate JWT
        $token = generateJWT([
            'userId' => $result,
            'email' => $email,
            'exp' => time() + SESSION_LIFETIME
        ]);
        
        $this->successResponse([
            'user' => [
                'id' => $result,
                'email' => $email,
                'firstName' => $firstName,
                'lastName' => $lastName
            ],
            'token' => $token
        ], 'User registered successfully', 201);
    }
    
    private function loginUser() {
        $input = $this->getJsonInput(['email', 'password']);
        
        $email = $this->sanitizeInput($input['email']);
        $password = $input['password'];
        
        $stmt = $this->db->getConnection()->prepare("
            SELECT id, email, password_hash, first_name, last_name 
            FROM users WHERE email = ?
        ");
        $stmt->execute([$email]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$user || !password_verify($password, $user['password_hash'])) {
            throw new AuthenticationException('Invalid credentials');
        }
        
        // Generate JWT
        $token = generateJWT([
            'userId' => $user['id'],
            'email' => $user['email'],
            'exp' => time() + SESSION_LIFETIME
        ]);
        
        $this->successResponse([
            'user' => [
                'id' => $user['id'],
                'email' => $user['email'],
                'firstName' => $user['first_name'],
                'lastName' => $user['last_name']
            ],
            'token' => $token
        ], 'Login successful');
    }
    
    private function verifyToken() {
        $this->successResponse([
            'valid' => true,
            'user' => [
                'id' => $this->user['userId'],
                'email' => $this->user['email']
            ]
        ]);
    }
}

// Initialize and handle request
$api = new AuthApi();
$api->handleRequest();
?>