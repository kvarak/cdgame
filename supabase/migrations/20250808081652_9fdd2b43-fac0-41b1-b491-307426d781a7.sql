-- Drop the existing status constraint
ALTER TABLE public.game_sessions DROP CONSTRAINT game_sessions_status_check;

-- Add new constraint that includes 'ended' but keeps existing valid statuses
ALTER TABLE public.game_sessions ADD CONSTRAINT game_sessions_status_check
CHECK (status IN ('waiting', 'in_progress', 'completed', 'cancelled', 'ended', 'playing'));