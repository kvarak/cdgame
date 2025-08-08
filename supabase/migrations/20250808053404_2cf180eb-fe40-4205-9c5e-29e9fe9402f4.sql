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