-- Fix RLS policies for game creation flow

-- Drop the problematic game_players INSERT policy
DROP POLICY IF EXISTS "Authenticated users can join waiting games" ON public.game_players;

-- Create a simpler policy that allows authenticated users to insert game players
CREATE POLICY "Authenticated users can create game players" 
ON public.game_players 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

-- Also ensure the game_sessions INSERT policy is correct
DROP POLICY IF EXISTS "Authenticated users can create game sessions" ON public.game_sessions;

CREATE POLICY "Authenticated users can create game sessions" 
ON public.game_sessions 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);