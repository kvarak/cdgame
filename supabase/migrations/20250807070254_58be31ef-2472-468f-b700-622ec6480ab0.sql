-- Fix security warnings: Set search_path for functions

-- Update cleanup function with proper search_path
CREATE OR REPLACE FUNCTION public.cleanup_old_games()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  DELETE FROM public.game_sessions 
  WHERE created_at < NOW() - INTERVAL '24 hours'
    AND status IN ('waiting', 'cancelled');
END;
$$;

-- Update validate_game_access function with proper search_path
CREATE OR REPLACE FUNCTION public.validate_game_access(session_id uuid, player_name text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.game_players 
    WHERE game_session_id = session_id 
    AND player_name = validate_game_access.player_name
  );
END;
$$;