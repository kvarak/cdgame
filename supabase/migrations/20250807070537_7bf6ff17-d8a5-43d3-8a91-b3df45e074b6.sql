-- Enable pg_cron extension for scheduled tasks
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule cleanup function to run every hour
SELECT cron.schedule(
  'cleanup-old-games',
  '0 * * * *', -- Every hour at minute 0
  $$
  SELECT public.cleanup_old_games();
  $$
);