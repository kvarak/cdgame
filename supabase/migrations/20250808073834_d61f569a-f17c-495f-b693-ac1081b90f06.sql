-- Check current constraints on game_players table
SELECT conname, pg_get_constraintdef(oid) as constraint_def 
FROM pg_constraint 
WHERE conrelid = 'public.game_players'::regclass;

-- Drop the role validation constraint to allow null roles for hosts
ALTER TABLE public.game_players DROP CONSTRAINT IF EXISTS valid_player_role;

-- Create a new constraint that allows null roles (for hosts) but validates non-null roles
ALTER TABLE public.game_players ADD CONSTRAINT valid_player_role_or_null 
CHECK (player_role IS NULL OR player_role IN ('Developer', 'QA Engineer', 'DevOps Engineer', 'Product Owner', 'Security Engineer', 'Site Reliability Engineer'));

-- Update the column to allow nulls
ALTER TABLE public.game_players ALTER COLUMN player_role DROP NOT NULL;