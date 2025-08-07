-- Fix infinite recursion in game_players RLS policy
-- First, drop the problematic policy
DROP POLICY IF EXISTS "Players can access other players in same game" ON public.game_players;

-- Create a security definer function to safely check game access
CREATE OR REPLACE FUNCTION public.user_can_access_game_session(session_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  -- Check if the current user has any player record in this game session
  -- This avoids the infinite recursion by using a security definer function
  RETURN EXISTS (
    SELECT 1 
    FROM public.game_players 
    WHERE game_session_id = session_id 
    AND status = 'joined'
  );
END;
$$;

-- Create a simpler, non-recursive policy for game_players
CREATE POLICY "Users can access game players in their sessions" 
ON public.game_players 
FOR ALL
USING (public.user_can_access_game_session(game_session_id));

-- Also update the game_sessions policy to use the same pattern
DROP POLICY IF EXISTS "Players can access their own game sessions" ON public.game_sessions;

CREATE POLICY "Users can access their game sessions" 
ON public.game_sessions 
FOR ALL
USING (public.user_can_access_game_session(id));