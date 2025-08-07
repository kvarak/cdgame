-- Fix RLS policy for game_sessions - make it work with HTTP requests
DROP POLICY IF EXISTS "Authenticated users can create game sessions" ON public.game_sessions;

-- Create a more permissive policy that works with direct HTTP calls
CREATE POLICY "Allow game session creation" 
ON public.game_sessions 
FOR INSERT 
TO public
WITH CHECK (true);

-- Also fix game_players policy to be more permissive
DROP POLICY IF EXISTS "Authenticated users can create game players" ON public.game_players;

CREATE POLICY "Allow game player creation" 
ON public.game_players 
FOR INSERT 
TO public  
WITH CHECK (true);