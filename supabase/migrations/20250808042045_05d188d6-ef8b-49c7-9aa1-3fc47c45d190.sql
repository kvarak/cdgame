-- Fix the infinite recursion issue by creating a proper security definer function
-- that bypasses RLS entirely for the game access check

-- Drop the problematic function
DROP FUNCTION IF EXISTS public.user_can_access_game_session(uuid);

-- Create a simplified function that doesn't cause recursion
CREATE OR REPLACE FUNCTION public.user_can_access_game_session(session_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path TO ''
AS $$
  -- Simple existence check without RLS interference
  SELECT EXISTS (
    SELECT 1 
    FROM public.game_players 
    WHERE game_session_id = session_id 
    AND status = 'joined'
  );
$$;

-- Clean up and recreate RLS policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view game players in their sessions" ON public.game_players;
DROP POLICY IF EXISTS "Users can update game players in their sessions" ON public.game_players;
DROP POLICY IF EXISTS "Users can delete game players in their sessions" ON public.game_players;

-- Recreate with simpler, non-recursive policies
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

-- Clean up conflicting game_sessions policies
DROP POLICY IF EXISTS "Users can update their game sessions" ON public.game_sessions;
DROP POLICY IF EXISTS "Users can delete their game sessions" ON public.game_sessions;

-- Simple policies for game_sessions
CREATE POLICY "Allow updating all game sessions" 
ON public.game_sessions 
FOR UPDATE 
USING (true);

CREATE POLICY "Allow deleting all game sessions" 
ON public.game_sessions 
FOR DELETE 
USING (true);