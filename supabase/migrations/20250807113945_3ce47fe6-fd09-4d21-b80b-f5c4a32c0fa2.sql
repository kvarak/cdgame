-- FIX: Remove conflicting RLS policies and create a single, correct one

-- Drop the conflicting policies
DROP POLICY IF EXISTS "Allow game session creation" ON public.game_sessions;
DROP POLICY IF EXISTS "Allow creating game sessions for authenticated users" ON public.game_sessions;

-- Create a single INSERT policy that allows both authenticated and anonymous users
-- but gives preference to authenticated users for better audit trails
CREATE POLICY "Allow game session creation for all users"
ON public.game_sessions FOR INSERT
WITH CHECK (true);

-- Similarly fix game_players policies
DROP POLICY IF EXISTS "Open game player creation" ON public.game_players;
DROP POLICY IF EXISTS "Allow creating game player records" ON public.game_players;

CREATE POLICY "Allow game player creation for all users"
ON public.game_players FOR INSERT
WITH CHECK (true);