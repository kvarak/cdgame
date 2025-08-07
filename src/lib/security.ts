// Security utilities for enhanced protection

import DOMPurify from 'isomorphic-dompurify';

// Rate limiting tracker for client-side
const rateLimitTracker = new Map<string, { count: number; lastReset: number }>();

// Enhanced XSS protection
export const sanitizeHtml = (input: string): string => {
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [], // Strip all HTML tags
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true
  });
};

// Comprehensive input sanitization
export const sanitizeInput = (input: string): string => {
  return input
    .replace(/[<>]/g, '') // Remove < and > characters
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers like onclick=
    .replace(/data:/gi, '') // Remove data: protocol
    .replace(/vbscript:/gi, '') // Remove vbscript: protocol
    .replace(/&/g, '&amp;') // Escape ampersands
    .replace(/"/g, '&quot;') // Escape quotes
    .replace(/'/g, '&#x27;') // Escape single quotes
    .trim();
};

// Client-side rate limiting
export const isRateLimited = (action: string, limit: number = 5, windowMs: number = 60000): boolean => {
  const now = Date.now();
  const key = `${action}_${Math.floor(now / windowMs)}`;
  
  const current = rateLimitTracker.get(key) || { count: 0, lastReset: now };
  
  if (now - current.lastReset > windowMs) {
    current.count = 0;
    current.lastReset = now;
  }
  
  current.count++;
  rateLimitTracker.set(key, current);
  
  return current.count > limit;
};

// Game code security validation
export const validateGameCodeSecurity = (code: string): { isValid: boolean; error?: string } => {
  // Check for SQL injection patterns
  const sqlInjectionPatterns = [
    /['";]/,
    /\b(DROP|DELETE|INSERT|UPDATE|SELECT|UNION|OR|AND)\b/i,
    /--/,
    /\/\*/,
    /\*\//
  ];
  
  for (const pattern of sqlInjectionPatterns) {
    if (pattern.test(code)) {
      return { isValid: false, error: "Invalid characters detected" };
    }
  }
  
  // Check for XSS patterns
  const xssPatterns = [
    /<[^>]*>/,
    /javascript:/i,
    /on\w+=/i,
    /data:/i,
    /vbscript:/i
  ];
  
  for (const pattern of xssPatterns) {
    if (pattern.test(code)) {
      return { isValid: false, error: "Invalid characters detected" };
    }
  }
  
  return { isValid: true };
};

// Player name security validation
export const validatePlayerNameSecurity = (name: string): { isValid: boolean; error?: string } => {
  // Check length
  if (name.length === 0 || name.length > 50) {
    return { isValid: false, error: "Name must be 1-50 characters" };
  }
  
  // Check for profanity (basic list)
  const profanityList = ['admin', 'moderator', 'system', 'null', 'undefined'];
  const lowerName = name.toLowerCase();
  
  for (const word of profanityList) {
    if (lowerName.includes(word)) {
      return { isValid: false, error: "Name contains reserved words" };
    }
  }
  
  // Check for excessive special characters
  const specialCharCount = (name.match(/[^a-zA-Z0-9\s]/g) || []).length;
  if (specialCharCount > 3) {
    return { isValid: false, error: "Too many special characters" };
  }
  
  // Check for repeated characters (potential spam)
  const repeatedChar = /(.)\1{4,}/;
  if (repeatedChar.test(name)) {
    return { isValid: false, error: "Excessive repeated characters" };
  }
  
  return { isValid: true };
};

// Secure session storage
export const secureSessionStorage = {
  set: (key: string, value: any): void => {
    try {
      const encrypted = btoa(JSON.stringify(value));
      sessionStorage.setItem(key, encrypted);
    } catch (error) {
      console.warn('Failed to store secure session data:', error);
    }
  },
  
  get: (key: string): any => {
    try {
      const encrypted = sessionStorage.getItem(key);
      if (!encrypted) return null;
      return JSON.parse(atob(encrypted));
    } catch (error) {
      console.warn('Failed to retrieve secure session data:', error);
      return null;
    }
  },
  
  remove: (key: string): void => {
    sessionStorage.removeItem(key);
  },
  
  clear: (): void => {
    sessionStorage.clear();
  }
};

// Error message sanitization (prevent information disclosure)
export const sanitizeErrorMessage = (error: any): string => {
  if (typeof error === 'string') {
    // Remove sensitive information from error messages
    return error
      .replace(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, '[IP]') // Hide IP addresses
      .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL]') // Hide emails
      .replace(/\b[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\b/gi, '[UUID]') // Hide UUIDs
      .substring(0, 200); // Limit error message length
  }
  
  if (error?.message) {
    return sanitizeErrorMessage(error.message);
  }
  
  return 'An unexpected error occurred';
};

// Content Security Policy nonce generator
export const generateNonce = (): string => {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};