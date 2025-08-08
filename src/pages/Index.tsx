import { useState, useEffect } from "react";
import { SimpleGameSetup } from "@/components/game/SimpleGameSetup";
import { GameBoardRefactored } from "@/components/game/GameBoardRefactored";
import { GameHistory } from "@/components/game/GameHistory";
import { WaitingRoom } from "@/components/game/WaitingRoom";
import { SpectatorView } from "@/components/game/SpectatorView";
import { useAuth } from "@/hooks/useAuth";

interface Player {
  id: string;
  name: string;
  role?: 'Developer' | 'QA Engineer' | 'DevOps Engineer' | 'Product Owner' | 'Security Engineer' | 'Site Reliability Engineer' | 'Random';
}

const Index = () => {
  const { user, loading: authLoading } = useAuth();
  const [gameState, setGameState] = useState<'setup' | 'waiting' | 'playing' | 'history'>('setup');
  const [players, setPlayers] = useState<Player[]>([]);
  const [gameCode, setGameCode] = useState<string>('');
  const [gameSessionId, setGameSessionId] = useState<string>('');
  const [isHost, setIsHost] = useState<boolean>(false);
  const [currentPlayerName, setCurrentPlayerName] = useState<string>('');

  // Parse URL parameters and localStorage on mount to restore game state
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const mode = urlParams.get('mode');
    const sessionId = urlParams.get('session');
    const hostStatus = urlParams.get('host') === 'true';
    const playerName = urlParams.get('name');
    const code = urlParams.get('code');

    // Check localStorage for persisted game state
    const persistedGame = localStorage.getItem('current_game_state');
    let gameData = null;
    
    if (persistedGame) {
      try {
        gameData = JSON.parse(persistedGame);
      } catch (e) {
        console.error('Error parsing persisted game state:', e);
        localStorage.removeItem('current_game_state');
      }
    }

    console.log('📍 URL Params:', { mode, sessionId, hostStatus, playerName, code });
    console.log('💾 Persisted Game:', gameData);

    // Prioritize URL params, then localStorage
    if (mode === 'waiting' && sessionId && playerName && code) {
      console.log('🎯 AUTO-ENTERING WAITING ROOM from URL params');
      setGameSessionId(sessionId);
      setIsHost(hostStatus);
      setCurrentPlayerName(decodeURIComponent(playerName));
      setGameCode(code);
      setGameState('waiting');
      
      // Persist this state
      localStorage.setItem('current_game_state', JSON.stringify({
        gameSessionId: sessionId,
        isHost: hostStatus,
        currentPlayerName: decodeURIComponent(playerName),
        gameCode: code,
        gameState: 'waiting',
        timestamp: Date.now()
      }));
      
      // Clean up URL without causing reload
      window.history.replaceState({}, '', '/');
    } else if (gameData && gameData.gameState && Date.now() - gameData.timestamp < 24 * 60 * 60 * 1000) {
      // Restore from localStorage if less than 24 hours old
      console.log('🔄 RESTORING GAME STATE from localStorage');
      setGameSessionId(gameData.gameSessionId);
      setIsHost(gameData.isHost);
      setCurrentPlayerName(gameData.currentPlayerName);
      setGameCode(gameData.gameCode);
      setGameState(gameData.gameState);
      
      if (gameData.players) {
        setPlayers(gameData.players);
      }
    }
  }, []);

  const handleStartGame = (gamePlayers: any[], code: string, sessionId: string) => {
    setPlayers(gamePlayers);
    setGameCode(code);
    setGameSessionId(sessionId);
    setGameState('playing');
    
    // Persist game state
    localStorage.setItem('current_game_state', JSON.stringify({
      gameSessionId: sessionId,
      isHost,
      currentPlayerName,
      gameCode: code,
      gameState: 'playing',
      players: gamePlayers,
      timestamp: Date.now()
    }));
  };

  const handleEndGame = () => {
    setGameState('setup');
    setPlayers([]);
    setGameCode('');
    setGameSessionId('');
    setIsHost(false);
    setCurrentPlayerName('');
    
    // Clear persisted state
    localStorage.removeItem('current_game_state');
  };

  const handleViewHistory = () => {
    setGameState('history');
  };

  const handleEnterWaitingRoom = (sessionId: string, hostStatus: boolean, playerName: string) => {
    setGameSessionId(sessionId);
    setIsHost(hostStatus);
    setCurrentPlayerName(playerName);
    setGameState('waiting');
    
    // Persist game state
    localStorage.setItem('current_game_state', JSON.stringify({
      gameSessionId: sessionId,
      isHost: hostStatus,
      currentPlayerName: playerName,
      gameCode,
      gameState: 'waiting',
      timestamp: Date.now()
    }));
  };

  const handleLeaveWaitingRoom = () => {
    setGameState('setup');
    setGameSessionId('');
    setIsHost(false);
    setCurrentPlayerName('');
    
    // Clear persisted state
    localStorage.removeItem('current_game_state');
  };

  const handleBackFromHistory = () => {
    setGameState('setup');
  };

  if (gameState === 'history') {
    return <GameHistory onBack={handleBackFromHistory} />;
  }

  if (gameState === 'waiting') {
    return (
      <WaitingRoom
        gameSessionId={gameSessionId}
        isHost={isHost}
        currentPlayerName={currentPlayerName}
        onStartGame={handleStartGame}
        onLeaveGame={handleLeaveWaitingRoom}
      />
    );
  }

  if (gameState === 'playing') {
    // Both host and team members use the same GameBoard component
    // The GameBoard will handle different views based on isHost prop
    return <GameBoardRefactored 
      players={players} 
      gameCode={gameCode} 
      gameSessionId={gameSessionId} 
      onEndGame={handleEndGame}
      onLeaveGame={handleLeaveWaitingRoom}
      isHost={isHost}
      currentPlayerName={currentPlayerName}
    />;
  }

  return <SimpleGameSetup />;
};

export default Index;
