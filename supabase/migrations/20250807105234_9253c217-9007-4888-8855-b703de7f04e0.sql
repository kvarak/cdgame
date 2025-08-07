-- Fix the join_game_session function to avoid ambiguous column reference
CREATE OR REPLACE FUNCTION public.join_game_session(p_game_code text, p_player_name text, p_player_role text DEFAULT 'Developer'::text)
RETURNS TABLE(session_id uuid, player_id uuid, host_name text, current_players integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_session_id UUID;
  v_player_id UUID;
  v_host_name TEXT;
  v_current_players INTEGER;
  v_max_players INTEGER;
BEGIN
  -- Find the game session (explicitly qualify the table name)
  SELECT gs.id, gs.host_name, gs.max_players INTO v_session_id, v_host_name, v_max_players
  FROM public.game_sessions gs
  WHERE gs.game_code = p_game_code AND gs.status = 'waiting';
  
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
$function$