-- First update existing records to use valid status values
UPDATE public.game_sessions 
SET status = 'playing' 
WHERE status = 'in_progress';

-- Drop the existing status constraint if it exists
ALTER TABLE public.game_sessions DROP CONSTRAINT IF EXISTS game_sessions_status_check;

-- Add new constraint that includes 'ended' status
ALTER TABLE public.game_sessions ADD CONSTRAINT game_sessions_status_check
CHECK (status IN ('waiting', 'playing', 'ended', 'cancelled'));