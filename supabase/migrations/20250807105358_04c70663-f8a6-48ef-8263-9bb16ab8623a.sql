-- Enable realtime for game tables
ALTER TABLE public.game_sessions REPLICA IDENTITY FULL;
ALTER TABLE public.game_players REPLICA IDENTITY FULL;

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_players;