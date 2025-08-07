-- Create game sessions table
CREATE TABLE public.game_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  game_code TEXT NOT NULL UNIQUE,
  host_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'waiting',
  current_turn INTEGER NOT NULL DEFAULT 0,
  score INTEGER NOT NULL DEFAULT 0,
  turn_count INTEGER NOT NULL DEFAULT 0,
  pipeline_stage INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create game players table
CREATE TABLE public.game_players (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  game_session_id UUID NOT NULL REFERENCES public.game_sessions(id) ON DELETE CASCADE,
  player_name TEXT NOT NULL,
  player_role TEXT NOT NULL,
  player_order INTEGER NOT NULL,
  is_host BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(game_session_id, player_order)
);

-- Enable Row Level Security
ALTER TABLE public.game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_players ENABLE ROW LEVEL SECURITY;

-- Create policies for public access
CREATE POLICY "Public access for game sessions" ON public.game_sessions FOR ALL USING (true);
CREATE POLICY "Public access for game players" ON public.game_players FOR ALL USING (true);