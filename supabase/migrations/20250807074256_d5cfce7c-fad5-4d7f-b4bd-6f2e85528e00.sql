-- Fix the game_sessions RLS policy to allow game creation
DROP POLICY IF EXISTS "Users can access their game sessions" ON public.game_sessions;

-- Create separate policies for different operations
CREATE POLICY "Authenticated users can create game sessions" 
ON public.game_sessions 
FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Users can view their game sessions" 
ON public.game_sessions 
FOR SELECT 
USING (public.user_can_access_game_session(id));

CREATE POLICY "Users can update their game sessions" 
ON public.game_sessions 
FOR UPDATE 
USING (public.user_can_access_game_session(id));

CREATE POLICY "Users can delete their game sessions" 
ON public.game_sessions 
FOR DELETE 
USING (public.user_can_access_game_session(id));