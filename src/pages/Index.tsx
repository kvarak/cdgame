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

  const handleStartGame = (gamePlayers: Player[]) => {
    setPlayers(gamePlayers);
    setGameState('playing');
  };

  const handleEndGame = () => {
    setGameState('setup');
    setPlayers([]);
  };

  if (gameState === 'playing') {
    return <GameBoard players={players} onEndGame={handleEndGame} />;
  }

  return <GameSetup onStartGame={handleStartGame} />;
};

export default Index;
