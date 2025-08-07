import { useState } from "react";
import { SimpleGameSetup } from "@/components/game/SimpleGameSetup";
import { GameBoard } from "@/components/game/GameBoard";
import { GameHistory } from "@/components/game/GameHistory";
import { WaitingRoom } from "@/components/game/WaitingRoom";
import { SpectatorView } from "@/components/game/SpectatorView";


interface Player {
  id: string;
  name: string;
  role: 'Developer' | 'QA Engineer' | 'DevOps Engineer' | 'Product Owner' | 'Security Engineer' | 'Site Reliability Engineer' | 'Random';
}

const Index = () => {
  const [gameState, setGameState] = useState<'setup' | 'waiting' | 'playing' | 'history'>('setup');
  const [players, setPlayers] = useState<Player[]>([]);
  const [gameCode, setGameCode] = useState<string>('');
  const [gameSessionId, setGameSessionId] = useState<string>('');
  const [isHost, setIsHost] = useState<boolean>(false);
  const [currentPlayerName, setCurrentPlayerName] = useState<string>('');

  const handleStartGame = (gamePlayers: Player[], code: string, sessionId: string) => {
    setPlayers(gamePlayers);
    setGameCode(code);
    setGameSessionId(sessionId);
    setGameState('playing');
  };

  const handleEndGame = () => {
    setGameState('setup');
    setPlayers([]);
    setGameCode('');
    setGameSessionId('');
  };

  const handleViewHistory = () => {
    setGameState('history');
  };

  const handleEnterWaitingRoom = (sessionId: string, hostStatus: boolean, playerName: string) => {
    setGameSessionId(sessionId);
    setIsHost(hostStatus);
    setCurrentPlayerName(playerName);
    setGameState('waiting');
  };

  const handleLeaveWaitingRoom = () => {
    setGameState('setup');
    setGameSessionId('');
    setIsHost(false);
    setCurrentPlayerName('');
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
    // Host gets full game control, others get spectator view
    if (isHost) {
      return <GameBoard players={players} gameCode={gameCode} gameSessionId={gameSessionId} onEndGame={handleEndGame} />;
    } else {
      return (
        <SpectatorView 
          gameSessionId={gameSessionId}
          currentPlayerName={currentPlayerName}
          gameCode={gameCode}
          onLeaveGame={handleLeaveWaitingRoom}
        />
      );
    }
  }

  return <SimpleGameSetup />;
};

export default Index;
