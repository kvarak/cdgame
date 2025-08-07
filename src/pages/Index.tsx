import { useState } from "react";
import { GameSetup } from "@/components/game/GameSetup";
import { GameBoard } from "@/components/game/GameBoard";

interface Player {
  id: string;
  name: string;
  role: 'Developer' | 'QA Engineer' | 'DevOps Engineer' | 'Product Owner' | 'Security Engineer' | 'Site Reliability Engineer';
}

const Index = () => {
  const [gameState, setGameState] = useState<'setup' | 'playing'>('setup');
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

  if (gameState === 'playing') {
    return <GameBoard players={players} gameCode={gameCode} gameSessionId={gameSessionId} onEndGame={handleEndGame} />;
  }

  return <GameSetup onStartGame={handleStartGame} />;
};

export default Index;
