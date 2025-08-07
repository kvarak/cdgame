import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, Minus, Users, Play } from "lucide-react";
import heroImage from "@/assets/devops-hero.jpg";

interface Player {
  id: string;
  name: string;
  role: 'Developer' | 'QA Engineer' | 'DevOps Engineer' | 'Product Owner' | 'Security Engineer' | 'Site Reliability Engineer';
}

interface GameSetupProps {
  onStartGame: (players: Player[]) => void;
}

const AVAILABLE_ROLES = [
  'Developer',
  'QA Engineer', 
  'DevOps Engineer',
  'Product Owner',
  'Security Engineer',
  'Site Reliability Engineer'
] as const;

const ROLE_COLORS = {
  'Developer': 'bg-pipeline-dev text-pipeline-dev-foreground',
  'QA Engineer': 'bg-pipeline-test text-pipeline-test-foreground',
  'DevOps Engineer': 'bg-pipeline-deploy text-pipeline-deploy-foreground',
  'Product Owner': 'bg-primary text-primary-foreground',
  'Security Engineer': 'bg-error text-error-foreground',
  'Site Reliability Engineer': 'bg-pipeline-monitor text-pipeline-monitor-foreground'
};

export const GameSetup = ({ onStartGame }: GameSetupProps) => {
  const [playerCount, setPlayerCount] = useState(2);
  const [players, setPlayers] = useState<Player[]>([
    { id: '1', name: '', role: 'Developer' },
    { id: '2', name: '', role: 'QA Engineer' }
  ]);

  const updatePlayerCount = (newCount: number) => {
    if (newCount < 1 || newCount > 6) return;
    
    const newPlayers = [...players];
    
    if (newCount > playerCount) {
      // Add new players
      for (let i = playerCount; i < newCount; i++) {
        newPlayers.push({
          id: String(i + 1),
          name: '',
          role: AVAILABLE_ROLES[i % AVAILABLE_ROLES.length]
        });
      }
    } else {
      // Remove players
      newPlayers.splice(newCount);
    }
    
    setPlayerCount(newCount);
    setPlayers(newPlayers);
  };

  const updatePlayer = (index: number, field: keyof Player, value: string) => {
    const newPlayers = [...players];
    newPlayers[index] = { ...newPlayers[index], [field]: value };
    setPlayers(newPlayers);
  };

  const canStartGame = players.every(player => player.name.trim() !== '');

  const handleStartGame = () => {
    if (canStartGame) {
      onStartGame(players);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="container mx-auto max-w-4xl">
        {/* Hero Section */}
        <div className="relative mb-8 overflow-hidden rounded-xl shadow-glow">
          <img 
            src={heroImage} 
            alt="DevOps Pipeline Game" 
            className="w-full h-64 object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
          <div className="absolute bottom-4 left-4 right-4">
            <h1 className="text-4xl font-bold mb-2 bg-gradient-primary bg-clip-text text-transparent">
              DevOps Pipeline Game
            </h1>
            <p className="text-muted-foreground text-lg">
              Cooperative board game for learning Continuous Delivery and DevOps practices
            </p>
          </div>
        </div>

        {/* Game Setup */}
        <Card className="bg-gradient-card shadow-card animate-slide-in">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-6 h-6 text-primary" />
              Game Setup
            </CardTitle>
            <CardDescription>
              Configure your team and start your DevOps journey together
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Player Count */}
            <div className="space-y-2">
              <Label htmlFor="player-count" className="text-base font-medium">
                Number of Players
              </Label>
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => updatePlayerCount(playerCount - 1)}
                  disabled={playerCount <= 1}
                >
                  <Minus className="w-4 h-4" />
                </Button>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-primary">{playerCount}</span>
                  <span className="text-muted-foreground">players</span>
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => updatePlayerCount(playerCount + 1)}
                  disabled={playerCount >= 6}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Player Configuration */}
            <div className="space-y-4">
              <Label className="text-base font-medium">Team Members</Label>
              <div className="grid gap-4">
                {players.map((player, index) => (
                  <Card key={player.id} className="p-4 border-border/50">
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <Label htmlFor={`player-${index}-name`} className="text-sm">
                          Player {index + 1} Name
                        </Label>
                        <Input
                          id={`player-${index}-name`}
                          placeholder="Enter player name"
                          value={player.name}
                          onChange={(e) => updatePlayer(index, 'name', e.target.value)}
                          className="mt-1"
                        />
                      </div>
                      <div className="flex-1">
                        <Label htmlFor={`player-${index}-role`} className="text-sm">
                          Role
                        </Label>
                        <select
                          id={`player-${index}-role`}
                          value={player.role}
                          onChange={(e) => updatePlayer(index, 'role', e.target.value)}
                          className="mt-1 w-full px-3 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                        >
                          {AVAILABLE_ROLES.map(role => (
                            <option key={role} value={role}>{role}</option>
                          ))}
                        </select>
                      </div>
                      <Badge className={ROLE_COLORS[player.role]}>
                        {player.role}
                      </Badge>
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            {/* Start Game Button */}
            <div className="pt-4">
              <Button
                onClick={handleStartGame}
                disabled={!canStartGame}
                className="w-full bg-gradient-primary hover:opacity-90 transition-opacity"
                size="lg"
              >
                <Play className="w-5 h-5 mr-2" />
                Start Game
              </Button>
              {!canStartGame && (
                <p className="text-muted-foreground text-sm mt-2 text-center">
                  Please enter names for all players to start the game
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};