-- Allow both authenticated and anonymous users to create games
-- Since this is a game that should work without requiring sign-in
DROP POLICY IF EXISTS "Authenticated users can create game sessions" ON public.game_sessions;

CREATE POLICY "Users can create game sessions" 
ON public.game_sessions 
FOR INSERT 
WITH CHECK (true);

-- Also update the other policies to work for both authenticated and anonymous users
DROP POLICY IF EXISTS "Users can view their game sessions" ON public.game_sessions;
DROP POLICY IF EXISTS "Users can update their game sessions" ON public.game_sessions;
DROP POLICY IF EXISTS "Users can delete their game sessions" ON public.game_sessions;

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