<?php
/**
 * Simple PHP router for development server
 */

$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

// Route API requests
if (strpos($uri, '/api/auth') === 0) {
    require_once __DIR__ . '/api/auth.php';
    exit;
} elseif (strpos($uri, '/api/stocks') === 0) {
    require_once __DIR__ . '/api/stocks.php';
    exit;
} elseif (strpos($uri, '/api/user') === 0) {
    require_once __DIR__ . '/api/user.php';
    exit;
}

// Route special pages
if ($uri === '/coming-soon' || $uri === '/coming-soon.html') {
    require_once __DIR__ . '/coming-soon.html';
    exit;
}

// Serve static files or main page
if ($uri === '/') {
    require_once __DIR__ . '/index.html';
} elseif (!file_exists(__DIR__ . $uri)) {
    require_once __DIR__ . '/index.html';
} else {
    return false; // Let PHP serve the file
}
?>