-- Add sprint voting state to game sessions
ALTER TABLE public.game_sessions 
ADD COLUMN IF NOT EXISTS current_sprint_state jsonb DEFAULT '{"phase": "planning", "selected_challenges": [], "voting_active": false}'::jsonb;