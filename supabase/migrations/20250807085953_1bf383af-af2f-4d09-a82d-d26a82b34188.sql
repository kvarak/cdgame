-- Create the missing create_game_session function
CREATE OR REPLACE FUNCTION public.create_game_session(p_game_code text, p_host_name text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  session_id UUID;
BEGIN
  INSERT INTO public.game_sessions (game_code, host_name, status)
  VALUES (p_game_code, p_host_name, 'waiting')
  RETURNING id INTO session_id;
  
  RETURN session_id;
END;
$function$;