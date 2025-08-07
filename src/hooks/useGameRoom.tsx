import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuditLogger } from './useAuditLogger';

export interface GamePlayer {
  id: string;
  name: string;
  role: 'Developer' | 'QA Engineer' | 'DevOps Engineer' | 'Product Owner' | 'Security Engineer' | 'Site Reliability Engineer';
  isHost: boolean;
  joinedAt: string;
  status: 'joined' | 'left' | 'kicked';
}

export interface GameSession {
  id: string;
  gameCode: string;
  hostName: string;
  status: 'waiting' | 'in_progress' | 'completed' | 'cancelled';
  maxPlayers: number;
  allowSpectators: boolean;
  createdAt: string;
}

export const useGameRoom = (gameSessionId?: string) => {
  const [gameSession, setGameSession] = useState<GameSession | null>(null);
  const [players, setPlayers] = useState<GamePlayer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { logGameEvent } = useAuditLogger();

  // Fetch initial game state
  const fetchGameState = useCallback(async () => {
    if (!gameSessionId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Fetch game session
      const { data: sessionData, error: sessionError } = await supabase
        .from('game_sessions')
        .select('*')
        .eq('id', gameSessionId)
        .single();
      
      if (sessionError) throw sessionError;
      
      setGameSession({
        id: sessionData.id,
        gameCode: sessionData.game_code,
        hostName: sessionData.host_name,
        status: sessionData.status as GameSession['status'],
        maxPlayers: sessionData.max_players || 6,
        allowSpectators: sessionData.allow_spectators || false,
        createdAt: sessionData.created_at
      });
      
      // Fetch players
      const { data: playersData, error: playersError } = await supabase
        .from('game_players')
        .select('*')
        .eq('game_session_id', gameSessionId)
        .eq('status', 'joined')
        .order('player_order');
      
      if (playersError) throw playersError;
      
      setPlayers(playersData.map(p => ({
        id: p.id,
        name: p.player_name,
        role: p.player_role as GamePlayer['role'],
        isHost: p.is_host,
        joinedAt: p.joined_at,
        status: p.status as GamePlayer['status']
      })));
      
    } catch (err: any) {
      setError(err.message);
      console.error('Error fetching game state:', err);
    } finally {
      setLoading(false);
    }
  }, [gameSessionId]);

  // Set up real-time subscriptions
  useEffect(() => {
    if (!gameSessionId) return;

    fetchGameState();

    // Subscribe to player changes
    const playersChannel = supabase
      .channel(`game_players:${gameSessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_players',
          filter: `game_session_id=eq.${gameSessionId}`
        },
        () => {
          fetchGameState(); // Refetch on any player changes
        }
      )
      .subscribe();

    // Subscribe to session changes
    const sessionChannel = supabase
      .channel(`game_sessions:${gameSessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'game_sessions',
          filter: `id=eq.${gameSessionId}`
        },
        () => {
          fetchGameState(); // Refetch on session changes
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(playersChannel);
      supabase.removeChannel(sessionChannel);
    };
  }, [gameSessionId, fetchGameState]);

  // Join game as a new player
  const joinGame = useCallback(async (gameCode: string, playerName: string, playerRole: GamePlayer['role'] = 'Developer') => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase.rpc('join_game_session', {
        p_game_code: gameCode,
        p_player_name: playerName,
        p_player_role: playerRole
      });
      
      if (error) throw error;
      
      const result = data[0];
      await logGameEvent('player_join', result.session_id, {
        playerName,
        playerRole,
        totalPlayers: result.current_players
      });
      
      return result;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [logGameEvent]);

  // Update player role
  const updatePlayerRole = useCallback(async (playerName: string, newRole: GamePlayer['role']) => {
    if (!gameSessionId) return;
    
    try {
      const { data, error } = await supabase.rpc('update_player_role', {
        p_session_id: gameSessionId,
        p_player_name: playerName,
        p_new_role: newRole
      });
      
      if (error) throw error;
      if (!data) throw new Error('Failed to update role');
      
      await logGameEvent('role_change', gameSessionId, {
        playerName,
        newRole
      });
      
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, [gameSessionId, logGameEvent]);

  // Start the game (host only)
  const startGame = useCallback(async () => {
    if (!gameSessionId) return;
    
    try {
      const { error } = await supabase
        .from('game_sessions')
        .update({ status: 'in_progress' })
        .eq('id', gameSessionId);
      
      if (error) throw error;
      
      await logGameEvent('start', gameSessionId, {
        totalPlayers: players.length,
        playerRoles: players.map(p => p.role)
      });
      
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, [gameSessionId, players, logGameEvent]);

  return {
    gameSession,
    players,
    loading,
    error,
    joinGame,
    updatePlayerRole,
    startGame,
    refetch: fetchGameState
  };
};