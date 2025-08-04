/**
 * API Client
 * Standardized HTTP client with error handling, authentication, and retry logic
 */
class ApiClient {
    constructor(baseURL = '', options = {}) {
        this.baseURL = baseURL;
        this.defaultHeaders = {
            'Content-Type': 'application/json',
            ...options.headers
        };
        this.timeout = options.timeout || 30000;
        this.retryAttempts = options.retryAttempts || 3;
        this.retryDelay = options.retryDelay || 1000;
        
        this.authTokenKey = 'lupo-auth-token';
        this.interceptors = {
            request: [],
            response: []
        };
    }

    addRequestInterceptor(interceptor) {
        this.interceptors.request.push(interceptor);
    }

    addResponseInterceptor(interceptor) {
        this.interceptors.response.push(interceptor);
    }

    getAuthToken() {
        return localStorage.getItem(this.authTokenKey);
    }

    setAuthToken(token) {
        localStorage.setItem(this.authTokenKey, token);
    }

    removeAuthToken() {
        localStorage.removeItem(this.authTokenKey);
    }

    buildHeaders(customHeaders = {}) {
        const headers = { ...this.defaultHeaders, ...customHeaders };
        
        const token = this.getAuthToken();
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        return headers;
    }

    buildURL(endpoint) {
        if (endpoint.startsWith('http')) {
            return endpoint;
        }
        
        const base = this.baseURL.endsWith('/') ? this.baseURL.slice(0, -1) : this.baseURL;
        const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
        
        return `${base}${path}`;
    }

    async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async executeRequest(config) {
        let lastError;
        
        for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
            try {
                const response = await this.makeRequest(config);
                return response;
            } catch (error) {
                lastError = error;
                
                console.warn(`Request attempt ${attempt} failed:`, error.message);
                
                if (attempt < this.retryAttempts && this.shouldRetry(error)) {
                    const delay = this.retryDelay * Math.pow(2, attempt - 1);
                    console.log(`Retrying in ${delay}ms...`);
                    await this.sleep(delay);
                    continue;
                }
                
                break;
            }
        }
        
        throw lastError;
    }

    shouldRetry(error) {
        if (error.name === 'AbortError') return false;
        if (error.status >= 400 && error.status < 500) return false;
        return true;
    }

    async makeRequest(config) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        try {
            for (const interceptor of this.interceptors.request) {
                config = await interceptor(config);
            }

            const requestConfig = {
                method: config.method,
                headers: this.buildHeaders(config.headers),
                signal: controller.signal,
                ...config.options
            };

            if (config.data && ['POST', 'PUT', 'PATCH'].includes(config.method)) {
                requestConfig.body = JSON.stringify(config.data);
            }

            const response = await fetch(this.buildURL(config.url), requestConfig);
            
            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new ApiError(
                    `HTTP ${response.status}: ${response.statusText}`,
                    response.status,
                    config.url,
                    await this.parseResponseBody(response)
                );
            }

            const responseData = await this.parseResponseBody(response);
            
            const apiResponse = new ApiResponse(responseData, response.status, response.headers);
            
            for (const interceptor of this.interceptors.response) {
                await interceptor(apiResponse);
            }

            const validation = ValidationUtils.validateApiResponse(responseData);
            if (!validation.isValid) {
                console.warn('API response validation failed:', validation.error);
            }

            return apiResponse;

        } catch (error) {
            clearTimeout(timeoutId);
            
            if (error.name === 'AbortError') {
                throw new ApiError('Request timeout', 408, config.url);
            }
            
            if (error instanceof ApiError) {
                throw error;
            }
            
            throw new ApiError(
                `Network error: ${error.message}`,
                0,
                config.url
            );
        }
    }

    async parseResponseBody(response) {
        const contentType = response.headers.get('content-type');
        
        if (contentType && contentType.includes('application/json')) {
            try {
                return await response.json();
            } catch (e) {
                return {};
            }
        }
        
        return await response.text();
    }

    async get(url, options = {}) {
        return this.executeRequest({
            method: 'GET',
            url,
            ...options
        });
    }

    async post(url, data, options = {}) {
        return this.executeRequest({
            method: 'POST',
            url,
            data,
            ...options
        });
    }

    async put(url, data, options = {}) {
        return this.executeRequest({
            method: 'PUT',
            url,
            data,
            ...options
        });
    }

    async patch(url, data, options = {}) {
        return this.executeRequest({
            method: 'PATCH',
            url,
            data,
            ...options
        });
    }

    async delete(url, options = {}) {
        return this.executeRequest({
            method: 'DELETE',
            url,
            ...options
        });
    }

    createBatch() {
        return new ApiBatch(this);
    }
}

class ApiResponse {
    constructor(data, status, headers) {
        this.data = data;
        this.status = status;
        this.headers = headers;
        this.success = data?.success || false;
        this.error = data?.error || null;
        this.message = data?.message || null;
    }

    isSuccess() {
        return this.success && this.status >= 200 && this.status < 300;
    }

    getData() {
        return this.data?.data || this.data;
    }

    getError() {
        return this.error || `HTTP ${this.status}`;
    }
}

class ApiError extends Error {
    constructor(message, status = 0, url = '', responseData = null) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.url = url;
        this.responseData = responseData;
        this.timestamp = new Date().toISOString();
    }

    isAuthError() {
        return this.status === 401 || this.status === 403;
    }

    isNetworkError() {
        return this.status === 0;
    }

    isServerError() {
        return this.status >= 500;
    }

    isClientError() {
        return this.status >= 400 && this.status < 500;
    }
}

class ApiBatch {
    constructor(apiClient) {
        this.apiClient = apiClient;
        this.requests = [];
    }

    add(method, url, data = null, options = {}) {
        this.requests.push({ method: method.toUpperCase(), url, data, options });
        return this;
    }

    async execute() {
        const promises = this.requests.map(request => {
            return this.apiClient.executeRequest(request).catch(error => ({ error }));
        });

        const results = await Promise.all(promises);
        
        return {
            results,
            errors: results.filter(r => r.error).map(r => r.error),
            successes: results.filter(r => !r.error),
            hasErrors: results.some(r => r.error)
        };
    }
}

const lupoApiClient = new ApiClient('/api', {
    timeout: 30000,
    retryAttempts: 3,
    retryDelay: 1000
});

lupoApiClient.addResponseInterceptor(async (response) => {
    if (response.status === 401) {
        console.warn('Authentication expired, redirecting to login');
        lupoApiClient.removeAuthToken();
        
        if (window.location.pathname !== '/') {
            window.location.href = '/';
        }
    }
});

window.ApiClient = ApiClient;
window.ApiResponse = ApiResponse;
window.ApiError = ApiError;
window.lupoApiClient = lupoApiClient;