-- Fix the conflicting status constraints
-- The error shows there are two different status constraints with different allowed values

-- Drop the conflicting constraint that expects 'active' instead of 'in_progress'
ALTER TABLE public.game_sessions DROP CONSTRAINT IF EXISTS valid_status;

-- Keep only the correct constraint that allows 'in_progress'
-- (game_sessions_status_check already exists and is correct)