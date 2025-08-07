-- Drop the problematic INSERT policy and recreate it with a proper condition
DROP POLICY IF EXISTS "Users can create game sessions" ON public.game_sessions;

-- Create a new INSERT policy that allows anyone to create game sessions
-- This is appropriate for a game where anonymous users can create sessions
CREATE POLICY "Anyone can create game sessions" 
ON public.game_sessions 
FOR INSERT 
WITH CHECK (true);

-- Also ensure the SELECT policy doesn't interfere during creation
-- Update it to be more permissive for game sessions
DROP POLICY IF EXISTS "Users can view their game sessions" ON public.game_sessions;

CREATE POLICY "Anyone can view game sessions" 
ON public.game_sessions 
FOR SELECT 
USING (true);