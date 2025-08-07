-- Fix RLS policy for game_players to allow hosts to create their player record
DROP POLICY "Users can access game players in their sessions" ON public.game_players;

-- Create separate policies for different operations
CREATE POLICY "Users can view game players in their sessions" 
ON public.game_players 
FOR SELECT 
USING (user_can_access_game_session(game_session_id));

CREATE POLICY "Users can update game players in their sessions" 
ON public.game_players 
FOR UPDATE 
USING (user_can_access_game_session(game_session_id));

CREATE POLICY "Users can delete game players in their sessions" 
ON public.game_players 
FOR DELETE 
USING (user_can_access_game_session(game_session_id));

-- Allow authenticated users to insert players into any waiting game session
-- This allows hosts to create their initial player record
CREATE POLICY "Authenticated users can join waiting games" 
ON public.game_players 
FOR INSERT 
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND EXISTS (
    SELECT 1 FROM public.game_sessions 
    WHERE id = game_session_id 
    AND status = 'waiting'
  )
);