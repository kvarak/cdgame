-- Complete cleanup of all conflicting policies
-- Disable RLS temporarily to clean up
ALTER TABLE public.game_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_players DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "Anyone can view game sessions" ON public.game_sessions;
DROP POLICY IF EXISTS "Allow reading game sessions for verification" ON public.game_sessions;
DROP POLICY IF EXISTS "Allow game session creation for all users" ON public.game_sessions;
DROP POLICY IF EXISTS "Allow updating own game sessions" ON public.game_sessions;
DROP POLICY IF EXISTS "Allow updating all game sessions" ON public.game_sessions;
DROP POLICY IF EXISTS "Allow deleting all game sessions" ON public.game_sessions;

DROP POLICY IF EXISTS "Allow reading game players for game participants" ON public.game_players;
DROP POLICY IF EXISTS "Allow reading all game players" ON public.game_players;
DROP POLICY IF EXISTS "Allow game player creation for all users" ON public.game_players;
DROP POLICY IF EXISTS "Allow updating own player records" ON public.game_players;
DROP POLICY IF EXISTS "Allow updating all game players" ON public.game_players;
DROP POLICY IF EXISTS "Allow deleting all game players" ON public.game_players;

-- Re-enable RLS
ALTER TABLE public.game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_players ENABLE ROW LEVEL SECURITY;

-- Create single, simple policies for each operation
CREATE POLICY "public_read_game_sessions" ON public.game_sessions FOR SELECT USING (true);
CREATE POLICY "public_insert_game_sessions" ON public.game_sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "public_update_game_sessions" ON public.game_sessions FOR UPDATE USING (true);
CREATE POLICY "public_delete_game_sessions" ON public.game_sessions FOR DELETE USING (true);

CREATE POLICY "public_read_game_players" ON public.game_players FOR SELECT USING (true);
CREATE POLICY "public_insert_game_players" ON public.game_players FOR INSERT WITH CHECK (true);
CREATE POLICY "public_update_game_players" ON public.game_players FOR UPDATE USING (true);
CREATE POLICY "public_delete_game_players" ON public.game_players FOR DELETE USING (true);