-- Add player status and connection tracking
ALTER TABLE public.game_players 
ADD COLUMN status TEXT DEFAULT 'joined' CHECK (status IN ('joined', 'left', 'kicked')),
ADD COLUMN joined_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
ADD COLUMN last_seen TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Add host controls for game starting
ALTER TABLE public.game_sessions 
ADD COLUMN max_players INTEGER DEFAULT 6,
ADD COLUMN allow_spectators BOOLEAN DEFAULT false;

-- Update game session status to include waiting
ALTER TABLE public.game_sessions 
DROP CONSTRAINT IF EXISTS game_sessions_status_check;

ALTER TABLE public.game_sessions 
ADD CONSTRAINT game_sessions_status_check 
CHECK (status IN ('waiting', 'in_progress', 'completed', 'cancelled'));

-- Function to add player to game session
CREATE OR REPLACE FUNCTION public.join_game_session(
  p_game_code TEXT,
  p_player_name TEXT,
  p_player_role TEXT DEFAULT 'Developer'
)
RETURNS TABLE(
  session_id UUID,
  player_id UUID,
  host_name TEXT,
  current_players INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_session_id UUID;
  v_player_id UUID;
  v_host_name TEXT;
  v_current_players INTEGER;
  v_max_players INTEGER;
BEGIN
  -- Find the game session
  SELECT id, host_name, max_players INTO v_session_id, v_host_name, v_max_players
  FROM public.game_sessions 
  WHERE game_code = p_game_code AND status = 'waiting';
  
  IF v_session_id IS NULL THEN
    RAISE EXCEPTION 'Game not found or not accepting players';
  END IF;
  
  -- Check if player name already exists in this game
  IF EXISTS (
    SELECT 1 FROM public.game_players 
    WHERE game_session_id = v_session_id 
    AND player_name = p_player_name 
    AND status = 'joined'
  ) THEN
    RAISE EXCEPTION 'Player name already taken in this game';
  END IF;
  
  -- Count current players
  SELECT COUNT(*) INTO v_current_players
  FROM public.game_players 
  WHERE game_session_id = v_session_id AND status = 'joined';
  
  -- Check max players
  IF v_current_players >= v_max_players THEN
    RAISE EXCEPTION 'Game is full';
  END IF;
  
  -- Add the player
  INSERT INTO public.game_players (
    game_session_id,
    player_name,
    player_role,
    player_order,
    is_host,
    status
  ) VALUES (
    v_session_id,
    p_player_name,
    p_player_role,
    v_current_players + 1,
    false,
    'joined'
  ) RETURNING id INTO v_player_id;
  
  -- Update player count
  v_current_players := v_current_players + 1;
  
  -- Log the join event
  INSERT INTO public.audit_logs (
    event_type,
    event_action,
    resource_type,
    resource_id,
    metadata
  ) VALUES (
    'game',
    'player_join',
    'game_session',
    v_session_id::text,
    jsonb_build_object(
      'player_name', p_player_name,
      'player_role', p_player_role,
      'total_players', v_current_players
    )
  );
  
  RETURN QUERY SELECT v_session_id, v_player_id, v_host_name, v_current_players;
END;
$$;

-- Function to update player role
CREATE OR REPLACE FUNCTION public.update_player_role(
  p_session_id UUID,
  p_player_name TEXT,
  p_new_role TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  -- Update the player's role
  UPDATE public.game_players 
  SET player_role = p_new_role, updated_at = now()
  WHERE game_session_id = p_session_id 
  AND player_name = p_player_name 
  AND status = 'joined';
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  -- Log the role change
  INSERT INTO public.audit_logs (
    event_type,
    event_action,
    resource_type,
    resource_id,
    metadata
  ) VALUES (
    'game',
    'role_change',
    'game_session',
    p_session_id::text,
    jsonb_build_object(
      'player_name', p_player_name,
      'new_role', p_new_role
    )
  );
  
  RETURN true;
END;
$$;