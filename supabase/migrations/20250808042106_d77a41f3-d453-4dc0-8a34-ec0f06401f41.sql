-- First drop all policies that depend on the function
DROP POLICY IF EXISTS "Users can update their game sessions" ON public.game_sessions;
DROP POLICY IF EXISTS "Users can delete their game sessions" ON public.game_sessions;
DROP POLICY IF EXISTS "Users can view game players in their sessions" ON public.game_players;
DROP POLICY IF EXISTS "Users can update game players in their sessions" ON public.game_players;
DROP POLICY IF EXISTS "Users can delete game players in their sessions" ON public.game_players;

-- Now drop the problematic function
DROP FUNCTION IF EXISTS public.user_can_access_game_session(uuid);

-- Create simple, non-recursive policies that allow basic operations
CREATE POLICY "Allow updating all game sessions" 
ON public.game_sessions 
FOR UPDATE 
USING (true);

CREATE POLICY "Allow deleting all game sessions" 
ON public.game_sessions 
FOR DELETE 
USING (true);

CREATE POLICY "Allow reading all game players" 
ON public.game_players 
FOR SELECT 
USING (true);

CREATE POLICY "Allow updating all game players" 
ON public.game_players 
FOR UPDATE 
USING (true);

CREATE POLICY "Allow deleting all game players" 
ON public.game_players 
FOR DELETE 
USING (true);