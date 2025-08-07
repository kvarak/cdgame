import { z } from 'zod';
import { sanitizeInput, validateGameCodeSecurity, validatePlayerNameSecurity } from './security';

// Game code validation - 8 characters, alphanumeric only (enhanced security)
export const gameCodeSchema = z.string()
  .length(8, "Game code must be exactly 8 characters")
  .regex(/^[A-Z0-9]+$/, "Game code must contain only letters and numbers")
  .transform(str => str.toUpperCase());

// Player name validation - prevent XSS and enforce length limits
export const playerNameSchema = z.string()
  .min(1, "Player name is required")
  .max(50, "Player name must be 50 characters or less")
  .regex(/^[a-zA-Z0-9\s\-_'\.]+$/, "Player name contains invalid characters")
  .transform(str => str.trim());

// Host name validation
export const hostNameSchema = playerNameSchema;

// Enhanced validation with security checks

// Validate and sanitize player name with enhanced security
export const validatePlayerName = (name: string): { isValid: boolean; sanitized: string; error?: string } => {
  try {
    const sanitized = sanitizeInput(name);
    
    // Additional security validation
    const securityCheck = validatePlayerNameSecurity(sanitized);
    if (!securityCheck.isValid) {
      return { isValid: false, sanitized, error: securityCheck.error };
    }
    
    const validated = playerNameSchema.parse(sanitized);
    return { isValid: true, sanitized: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { isValid: false, sanitized: sanitizeInput(name), error: error.errors[0].message };
    }
    return { isValid: false, sanitized: sanitizeInput(name), error: "Invalid input" };
  }
};

// Validate game code with enhanced security
export const validateGameCode = (code: string): { isValid: boolean; sanitized: string; error?: string } => {
  try {
    const sanitized = sanitizeInput(code);
    
    // Additional security validation
    const securityCheck = validateGameCodeSecurity(sanitized);
    if (!securityCheck.isValid) {
      return { isValid: false, sanitized, error: securityCheck.error };
    }
    
    const validated = gameCodeSchema.parse(sanitized);
    return { isValid: true, sanitized: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { isValid: false, sanitized: sanitizeInput(code), error: error.errors[0].message };
    }
    return { isValid: false, sanitized: sanitizeInput(code), error: "Invalid game code" };
  }
};