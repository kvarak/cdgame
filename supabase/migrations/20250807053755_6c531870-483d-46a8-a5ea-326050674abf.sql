-- Enable realtime for both tables (correct syntax)
ALTER TABLE public.game_sessions REPLICA IDENTITY FULL;
ALTER TABLE public.game_players REPLICA IDENTITY FULL;