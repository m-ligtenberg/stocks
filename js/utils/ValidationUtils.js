/**
 * Validation Utilities
 * Centralized input validation for forms and API calls
 */
class ValidationUtils {
    static email(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return {
            isValid: emailRegex.test(email),
            error: emailRegex.test(email) ? null : 'Invalid email format'
        };
    }

    static password(password, minLength = 6) {
        const errors = [];
        
        if (!password || password.length < minLength) {
            errors.push(`Password must be at least ${minLength} characters long`);
        }
        
        if (!/[A-Z]/.test(password)) {
            errors.push('Password must contain at least one uppercase letter');
        }
        
        if (!/[a-z]/.test(password)) {
            errors.push('Password must contain at least one lowercase letter');
        }
        
        if (!/\d/.test(password)) {
            errors.push('Password must contain at least one number');
        }

        return {
            isValid: errors.length === 0,
            error: errors.length > 0 ? errors[0] : null,
            allErrors: errors
        };
    }

    static stockSymbol(symbol) {
        const symbolRegex = /^[A-Z]{1,5}$/;
        return {
            isValid: symbolRegex.test(symbol),
            error: symbolRegex.test(symbol) ? null : 'Stock symbol must be 1-5 uppercase letters'
        };
    }

    static tradeAmount(amount) {
        const numAmount = parseFloat(amount);
        const isValid = !isNaN(numAmount) && numAmount > 0 && numAmount <= 1000000;
        
        return {
            isValid,
            error: isValid ? null : 'Amount must be a positive number up to $1,000,000',
            value: isValid ? numAmount : null
        };
    }

    static shares(shares) {
        const numShares = parseInt(shares);
        const isValid = !isNaN(numShares) && numShares > 0 && numShares <= 100000;
        
        return {
            isValid,
            error: isValid ? null : 'Shares must be a positive integer up to 100,000',
            value: isValid ? numShares : null
        };
    }

    static required(value, fieldName = 'Field') {
        const isValid = value !== null && value !== undefined && String(value).trim() !== '';
        return {
            isValid,
            error: isValid ? null : `${fieldName} is required`
        };
    }

    static name(name, fieldName = 'Name') {
        const nameRegex = /^[a-zA-Z\s'-]{2,50}$/;
        const isValid = nameRegex.test(name);
        
        return {
            isValid,
            error: isValid ? null : `${fieldName} must be 2-50 characters and contain only letters, spaces, hyphens, and apostrophes`
        };
    }

    static phone(phone) {
        const phoneRegex = /^\+?[\d\s\-\(\)]{10,15}$/;
        const isValid = phoneRegex.test(phone);
        
        return {
            isValid,
            error: isValid ? null : 'Phone number must be 10-15 digits'
        };
    }

    static dateOfBirth(date) {
        const birthDate = new Date(date);
        const today = new Date();
        const age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }

        const isValid = !isNaN(birthDate.getTime()) && age >= 18 && age <= 120;
        
        return {
            isValid,
            error: isValid ? null : 'You must be at least 18 years old',
            age: isValid ? age : null
        };
    }

    static validateForm(data, rules) {
        const errors = {};
        let isValid = true;

        for (const [field, fieldRules] of Object.entries(rules)) {
            const value = data[field];
            
            for (const rule of fieldRules) {
                let validation;
                
                if (typeof rule === 'string') {
                    switch (rule) {
                        case 'required':
                            validation = this.required(value, field);
                            break;
                        case 'email':
                            validation = this.email(value);
                            break;
                        case 'password':
                            validation = this.password(value);
                            break;
                        case 'stockSymbol':
                            validation = this.stockSymbol(value);
                            break;
                        case 'name':
                            validation = this.name(value, field);
                            break;
                        case 'phone':
                            validation = this.phone(value);
                            break;
                        case 'dateOfBirth':
                            validation = this.dateOfBirth(value);
                            break;
                        default:
                            validation = { isValid: true, error: null };
                    }
                } else if (typeof rule === 'function') {
                    validation = rule(value, field);
                } else if (typeof rule === 'object') {
                    if (rule.type === 'tradeAmount') {
                        validation = this.tradeAmount(value);
                    } else if (rule.type === 'shares') {
                        validation = this.shares(value);
                    } else if (rule.type === 'minLength') {
                        const isValid = String(value).length >= rule.value;
                        validation = {
                            isValid,
                            error: isValid ? null : `${field} must be at least ${rule.value} characters`
                        };
                    } else if (rule.type === 'maxLength') {
                        const isValid = String(value).length <= rule.value;
                        validation = {
                            isValid,
                            error: isValid ? null : `${field} must be no more than ${rule.value} characters`
                        };
                    }
                }

                if (validation && !validation.isValid) {
                    errors[field] = validation.error;
                    isValid = false;
                    break;
                }
            }
        }

        return { isValid, errors };
    }

    static sanitizeInput(input) {
        if (typeof input !== 'string') return input;
        
        return input
            .trim()
            .replace(/[<>]/g, '')
            .replace(/javascript:/gi, '')
            .replace(/on\w+=/gi, '');
    }

    static formatCurrency(amount) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    }

    static formatPercent(value, decimals = 2) {
        return `${(value * 100).toFixed(decimals)}%`;
    }

    static isValidJSON(str) {
        try {
            JSON.parse(str);
            return true;
        } catch (e) {
            return false;
        }
    }

    static validateApiResponse(response) {
        if (!response) {
            return { isValid: false, error: 'No response received' };
        }

        if (typeof response !== 'object') {
            return { isValid: false, error: 'Invalid response format' };
        }

        if (!response.hasOwnProperty('success')) {
            return { isValid: false, error: 'Response missing success indicator' };
        }

        return { isValid: true, error: null };
    }
}