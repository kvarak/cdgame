-- Check current constraint on game_sessions status
SELECT conname, pg_get_constraintdef(oid) as constraint_def
FROM pg_constraint
WHERE conrelid = 'public.game_sessions'::regclass
AND conname LIKE '%status%';

-- Drop the existing status constraint if it exists
ALTER TABLE public.game_sessions DROP CONSTRAINT IF EXISTS game_sessions_status_check;

-- Add new constraint that includes 'ended' status
ALTER TABLE public.game_sessions ADD CONSTRAINT game_sessions_status_check
CHECK (status IN ('waiting', 'playing', 'ended', 'cancelled'));