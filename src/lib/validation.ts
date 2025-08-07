import { z } from 'zod';

// Game code validation - 6 characters, alphanumeric only
export const gameCodeSchema = z.string()
  .length(6, "Game code must be exactly 6 characters")
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

// Sanitize HTML to prevent XSS attacks
export const sanitizeInput = (input: string): string => {
  return input
    .replace(/[<>]/g, '') // Remove < and > characters
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers like onclick=
    .trim();
};

// Validate and sanitize player name
export const validatePlayerName = (name: string): { isValid: boolean; sanitized: string; error?: string } => {
  try {
    const sanitized = sanitizeInput(name);
    const validated = playerNameSchema.parse(sanitized);
    return { isValid: true, sanitized: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { isValid: false, sanitized: sanitizeInput(name), error: error.errors[0].message };
    }
    return { isValid: false, sanitized: sanitizeInput(name), error: "Invalid input" };
  }
};

// Validate game code
export const validateGameCode = (code: string): { isValid: boolean; sanitized: string; error?: string } => {
  try {
    const sanitized = sanitizeInput(code);
    const validated = gameCodeSchema.parse(sanitized);
    return { isValid: true, sanitized: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { isValid: false, sanitized: sanitizeInput(code), error: error.errors[0].message };
    }
    return { isValid: false, sanitized: sanitizeInput(code), error: "Invalid game code" };
  }
};