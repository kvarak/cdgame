-- Fix the function search path security warning
CREATE OR REPLACE FUNCTION public.user_can_access_game_session(session_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
BEGIN
  -- Check if the current user has any player record in this game session
  -- This avoids the infinite recursion by using a security definer function
  RETURN EXISTS (
    SELECT 1 
    FROM public.game_players 
    WHERE game_session_id = session_id 
    AND status = 'joined'
  );
END;
$$;