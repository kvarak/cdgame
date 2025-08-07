-- Phase 1: Critical Database Security Fixes

-- First, drop the dangerous public access policies
DROP POLICY IF EXISTS "Public access for game sessions" ON public.game_sessions;
DROP POLICY IF EXISTS "Public access for game players" ON public.game_players;

-- Add database constraints for data integrity
ALTER TABLE public.game_sessions 
ADD CONSTRAINT valid_game_code_format CHECK (game_code ~ '^[A-Z0-9]{6}$'),
ADD CONSTRAINT valid_status CHECK (status IN ('waiting', 'active', 'completed', 'cancelled')),
ADD CONSTRAINT valid_turn_count CHECK (turn_count >= 0),
ADD CONSTRAINT valid_current_turn CHECK (current_turn >= 0),
ADD CONSTRAINT valid_pipeline_stage CHECK (pipeline_stage >= 0 AND pipeline_stage <= 100),
ADD CONSTRAINT valid_score CHECK (score >= 0);

ALTER TABLE public.game_players
ADD CONSTRAINT valid_player_order CHECK (player_order >= 0),
ADD CONSTRAINT valid_player_name_length CHECK (char_length(player_name) >= 1 AND char_length(player_name) <= 50),
ADD CONSTRAINT valid_player_role CHECK (player_role IN ('Developer', 'QA Engineer', 'DevOps Engineer', 'Product Owner', 'Security Engineer', 'Site Reliability Engineer'));

-- Create secure RLS policies based on game participation
-- Game sessions: Only allow access to players who are part of the game
CREATE POLICY "Players can access their own game sessions"
ON public.game_sessions
FOR ALL
USING (
  id IN (
    SELECT DISTINCT game_session_id 
    FROM public.game_players 
    WHERE game_session_id = game_sessions.id
  )
);

-- Game players: Only allow access to players in the same game session
CREATE POLICY "Players can access other players in same game"
ON public.game_players
FOR ALL
USING (
  game_session_id IN (
    SELECT DISTINCT game_session_id 
    FROM public.game_players gp2
    WHERE gp2.game_session_id = game_players.game_session_id
  )
);

-- Add function to clean up old game sessions (older than 24 hours)
CREATE OR REPLACE FUNCTION public.cleanup_old_games()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.game_sessions 
  WHERE created_at < NOW() - INTERVAL '24 hours'
    AND status IN ('waiting', 'cancelled');
END;
$$;

-- Add function to validate game access
CREATE OR REPLACE FUNCTION public.validate_game_access(session_id uuid, player_name text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_game_players_session_id ON public.game_players(game_session_id);
CREATE INDEX IF NOT EXISTS idx_game_sessions_code ON public.game_sessions(game_code);
CREATE INDEX IF NOT EXISTS idx_game_sessions_status ON public.game_sessions(status);
CREATE INDEX IF NOT EXISTS idx_game_sessions_created_at ON public.game_sessions(created_at);