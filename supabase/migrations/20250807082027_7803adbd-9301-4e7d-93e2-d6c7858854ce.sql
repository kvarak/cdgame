-- Delete old game sessions with invalid game codes (they're likely test data)
DELETE FROM public.game_sessions 
WHERE NOT (game_code ~ '^[A-Z0-9]{8}$');

-- Now add the correct constraint for 8-character codes
ALTER TABLE public.game_sessions 
ADD CONSTRAINT valid_game_code_format 
CHECK (game_code ~ '^[A-Z0-9]{8}$');

-- Update the INSERT policy to require authentication for creating games
DROP POLICY IF EXISTS "Anyone can create game sessions" ON public.game_sessions;

CREATE POLICY "Authenticated users can create game sessions" 
ON public.game_sessions 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);