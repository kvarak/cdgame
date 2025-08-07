-- Force refresh the game_players policy
DROP POLICY IF EXISTS "Allow game player creation" ON public.game_players;

-- Create a completely open policy for game player creation during testing
CREATE POLICY "Open game player creation" 
ON public.game_players 
FOR INSERT 
WITH CHECK (true);

-- Check if there are any other restrictive policies
DROP POLICY IF EXISTS "Authenticated users can join waiting games" ON public.game_players;