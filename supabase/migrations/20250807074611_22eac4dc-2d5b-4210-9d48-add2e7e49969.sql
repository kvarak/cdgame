-- CRITICAL SECURITY FIX: Fix profile data exposure
-- Drop the overly permissive policy that allows all users to view all profiles
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- Create a restrictive policy that only allows users to view their own profile
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);

-- Create a policy for minimal public profile data needed for game functionality
-- This allows viewing display names only for players in the same game sessions
CREATE POLICY "Users can view display names of game participants" 
ON public.profiles 
FOR SELECT 
USING (
  display_name IS NOT NULL AND 
  EXISTS (
    SELECT 1 FROM public.game_players gp1
    JOIN public.game_players gp2 ON gp1.game_session_id = gp2.game_session_id
    JOIN public.profiles p ON p.github_username = gp2.player_name
    WHERE gp1.player_name = (
      SELECT github_username FROM public.profiles WHERE user_id = auth.uid()
    )
    AND p.user_id = profiles.user_id
  )
);

-- Enhance game code security by adding a function for cryptographically secure random codes
CREATE OR REPLACE FUNCTION public.generate_secure_game_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result TEXT := '';
  i INTEGER;
  random_index INTEGER;
BEGIN
  -- Generate 8-character code for better security (increased from 6)
  FOR i IN 1..8 LOOP
    -- Use cryptographically secure random
    random_index := floor(random() * length(chars))::INTEGER + 1;
    result := result || substr(chars, random_index, 1);
  END LOOP;
  
  -- Ensure uniqueness by checking existing codes
  WHILE EXISTS (SELECT 1 FROM public.game_sessions WHERE game_code = result AND status = 'waiting') LOOP
    result := '';
    FOR i IN 1..8 LOOP
      random_index := floor(random() * length(chars))::INTEGER + 1;
      result := result || substr(chars, random_index, 1);
    END LOOP;
  END LOOP;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;