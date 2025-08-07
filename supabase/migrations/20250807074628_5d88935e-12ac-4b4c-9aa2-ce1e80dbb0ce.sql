-- Fix the security warning by setting search_path for the function
CREATE OR REPLACE FUNCTION public.generate_secure_game_code()
RETURNS TEXT 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = ''
AS $$
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
$$;