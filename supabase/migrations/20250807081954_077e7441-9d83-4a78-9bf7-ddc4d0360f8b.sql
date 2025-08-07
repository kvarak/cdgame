-- First, let's see what game codes exist that are causing issues
SELECT game_code, LENGTH(game_code), created_at 
FROM public.game_sessions 
WHERE NOT (game_code ~ '^[A-Z0-9]{8}$') 
ORDER BY created_at DESC;