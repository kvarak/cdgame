-- Test insert to diagnose the issue
INSERT INTO game_sessions (game_code, host_name, status) 
VALUES ('TEST123', 'test_host', 'waiting');