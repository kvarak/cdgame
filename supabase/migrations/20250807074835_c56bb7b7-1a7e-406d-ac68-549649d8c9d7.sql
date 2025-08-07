-- Fix the INSERT policy for game_sessions - the WITH CHECK should be (true) not true
DROP POLICY IF EXISTS "Authenticated users can create game sessions" ON public.game_sessions;

CREATE POLICY "Authenticated users can create game sessions" 
ON public.game_sessions 
FOR INSERT 
TO authenticated
WITH CHECK (true);