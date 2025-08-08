-- Add sprint voting state to game sessions
ALTER TABLE public.game_sessions 
ADD COLUMN IF NOT EXISTS current_sprint_state jsonb DEFAULT '{"phase": "planning", "selected_challenges": [], "voting_active": false}'::jsonb;

-- Add function to update sprint state
CREATE OR REPLACE FUNCTION public.update_sprint_state(
  p_session_id uuid,
  p_sprint_state jsonb
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  UPDATE public.game_sessions 
  SET 
    current_sprint_state = p_sprint_state,
    updated_at = now()
  WHERE id = p_session_id;
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  RETURN true;
END;
$function$

-- Add function to submit player vote
CREATE OR REPLACE FUNCTION public.submit_player_vote(
  p_session_id uuid,
  p_player_name text,
  p_most_important text,
  p_least_important text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  current_votes jsonb;
  updated_votes jsonb;
BEGIN
  -- Get current votes from sprint state
  SELECT current_sprint_state->'votes' INTO current_votes
  FROM public.game_sessions
  WHERE id = p_session_id;
  
  -- Initialize votes if null
  IF current_votes IS NULL THEN
    current_votes := '{}'::jsonb;
  END IF;
  
  -- Add this player's vote
  updated_votes := current_votes || jsonb_build_object(
    p_player_name, 
    jsonb_build_object(
      'most_important', p_most_important,
      'least_important', p_least_important,
      'timestamp', extract(epoch from now())
    )
  );
  
  -- Update sprint state with new votes
  UPDATE public.game_sessions 
  SET 
    current_sprint_state = current_sprint_state || jsonb_build_object('votes', updated_votes),
    updated_at = now()
  WHERE id = p_session_id;
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  RETURN true;
END;
$function$