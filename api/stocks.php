<?php
/**
 * Lupo Trading Platform - Stock Data API
 * Real-time stock quotes via Alpha Vantage
 */

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/BaseApi.php';

class StocksApi extends BaseApi {
    private $stockService;
    
    public function __construct() {
        parent::__construct();
        $this->stockService = new StockDataService();
    }
    
    protected function handleGet($pathParts) {
        $action = $pathParts[2] ?? '';
        
        switch ($action) {
            case 'quote':
                $symbol = $pathParts[3] ?? '';
                if (!$symbol) {
                    throw new ValidationException('Symbol required');
                }
                $this->getStockQuote($symbol);
                break;
            case 'opportunities':
                $this->getOpportunities();
                break;
            case 'search':
                $query = $_GET['q'] ?? $pathParts[3] ?? '';
                if (!$query) {
                    throw new ValidationException('Search query required');
                }
                $this->searchStocks($query);
                break;
            default:
                throw new NotFoundException('Invalid endpoint');
        }
    }
    
    protected function handlePost($pathParts) {
        $action = $pathParts[2] ?? '';
        
        switch ($action) {
            case 'quotes':
                $this->getMultipleQuotes();
                break;
            default:
                throw new NotFoundException('Invalid endpoint');
        }
    }
    
    private function getStockQuote($symbol) {
        $symbol = strtoupper($this->sanitizeInput($symbol));
        $stockData = $this->stockService->getStockData($symbol);
        $this->successResponse($stockData);
    }
    
    private function getMultipleQuotes() {
        $input = $this->getJsonInput(['symbols']);
        $symbols = $input['symbols'];
        
        if (!is_array($symbols)) {
            throw new ValidationException('Symbols must be an array');
        }
        
        if (count($symbols) > 10) {
            throw new ValidationException('Maximum 10 symbols allowed per request');
        }
        
        $results = [];
        foreach ($symbols as $symbol) {
            $symbol = strtoupper($this->sanitizeInput($symbol));
            $results[] = $this->stockService->getStockData($symbol);
        }
        
        $this->successResponse($results);
    }
    
    private function getOpportunities() {
        $cacheKey = 'opportunities_' . date('Y-m-d-H');
        $cached = $this->cacheGet($cacheKey);
        
        if ($cached) {
            $this->successResponse($cached);
            return;
        }
        
        $popularSymbols = ['AAPL', 'MSFT', 'NVDA', 'TSLA', 'NOK', 'AMC', 'HYSR', 'PLTR'];
        
        $stockData = [];
        foreach ($popularSymbols as $symbol) {
            $stockData[] = $this->stockService->getStockData($symbol);
        }
        
        // Categorize by price
        $opportunities = [
            'under1' => array_values(array_filter($stockData, fn($stock) => $stock['price'] < 1)),
            'under4' => array_values(array_filter($stockData, fn($stock) => $stock['price'] >= 1 && $stock['price'] < 4)),
            'under5' => array_values(array_filter($stockData, fn($stock) => $stock['price'] >= 4))
        ];
        
        // Cache for 1 hour
        $this->cacheSet($cacheKey, $opportunities, 3600);
        
        $this->successResponse($opportunities);
    }
    
    private function searchStocks($query) {
        $query = strtoupper($this->sanitizeInput($query));
        
        $popularStocks = [
            'AAPL', 'MSFT', 'NVDA', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NFLX',
            'NOK', 'AMD', 'INTC', 'PLTR', 'AMC', 'GME', 'RIVN', 'LCID',
            'HYSR', 'ACST', 'URG', 'TTI', 'SB', 'DSGN', 'SRNE'
        ];

        $matches = array_filter($popularStocks, function($symbol) use ($query) {
            return strpos($symbol, $query) === 0;
        });
        
        $matches = array_slice(array_values($matches), 0, 10);
        $this->successResponse($matches);
    }
}

// Initialize and handle request
$api = new StocksApi();
$api->handleRequest();
?>