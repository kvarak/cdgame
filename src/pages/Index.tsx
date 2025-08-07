import { useState } from "react";
import { GameSetup } from "@/components/game/GameSetup";
import { GameBoard } from "@/components/game/GameBoard";
import { GameHistory } from "@/components/game/GameHistory";
import { AuthButton } from "@/components/auth/AuthButton";

interface Player {
  id: string;
  name: string;
  role: 'Developer' | 'QA Engineer' | 'DevOps Engineer' | 'Product Owner' | 'Security Engineer' | 'Site Reliability Engineer';
}

const Index = () => {
  const [gameState, setGameState] = useState<'setup' | 'playing' | 'history'>('setup');
  const [players, setPlayers] = useState<Player[]>([]);

  const [gameCode, setGameCode] = useState<string>('');
  const [gameSessionId, setGameSessionId] = useState<string>('');

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

  const handleBackFromHistory = () => {
    setGameState('setup');
  };

  if (gameState === 'history') {
    return <GameHistory onBack={handleBackFromHistory} />;
  }

  if (gameState === 'playing') {
    return <GameBoard players={players} gameCode={gameCode} gameSessionId={gameSessionId} onEndGame={handleEndGame} />;
  }

  return (
    <div className="relative">
      <div className="absolute top-4 right-4 z-10">
        <AuthButton onViewHistory={handleViewHistory} />
      </div>
      <GameSetup onStartGame={handleStartGame} />
    </div>
  );
};

export default Index;
