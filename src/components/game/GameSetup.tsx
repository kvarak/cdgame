import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, Minus, Users, Play, GamepadIcon } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import heroImage from "@/assets/devops-hero.jpg";
import { validatePlayerName, validateGameCode } from "@/lib/validation";

interface Player {
  id: string;
  name: string;
  role: 'Developer' | 'QA Engineer' | 'DevOps Engineer' | 'Product Owner' | 'Security Engineer' | 'Site Reliability Engineer' | 'Random';
}

interface GameSetupProps {
  onStartGame: (players: Player[], gameCode: string, gameSessionId: string) => void;
}

const AVAILABLE_ROLES = [
  'Random',
  'Developer',
  'QA Engineer', 
  'DevOps Engineer',
  'Product Owner',
  'Security Engineer',
  'Site Reliability Engineer'
] as const;

const ROLE_COLORS = {
  'Random': 'bg-gradient-primary text-white',
  'Developer': 'bg-pipeline-dev text-pipeline-dev-foreground',
  'QA Engineer': 'bg-pipeline-test text-pipeline-test-foreground',
  'DevOps Engineer': 'bg-pipeline-deploy text-pipeline-deploy-foreground',
  'Product Owner': 'bg-primary text-primary-foreground',
  'Security Engineer': 'bg-error text-error-foreground',
  'Site Reliability Engineer': 'bg-pipeline-monitor text-pipeline-monitor-foreground'
};

export const GameSetup = ({ onStartGame }: GameSetupProps) => {
  const [gameMode, setGameMode] = useState<'create' | 'join'>('create');
  const [playerCount, setPlayerCount] = useState(2);
  const [players, setPlayers] = useState<Player[]>([
    { id: '1', name: '', role: 'Random' },
    { id: '2', name: '', role: 'Random' }
  ]);
  const [hostName, setHostName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const updatePlayerCount = (newCount: number) => {
    if (newCount < 1 || newCount > 6) return;
    
    const newPlayers = [...players];
    
    if (newCount > playerCount) {
      // Add new players
      for (let i = playerCount; i < newCount; i++) {
        newPlayers.push({
          id: String(i + 1),
          name: '',
          role: 'Random'
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

  const assignRandomRoles = (players: Player[]) => {
    const nonRandomRoles = AVAILABLE_ROLES.slice(1); // Exclude 'Random'
    return players.map(player => {
      if (player.role === 'Random') {
        const randomRole = nonRandomRoles[Math.floor(Math.random() * nonRandomRoles.length)];
        return { ...player, role: randomRole };
      }
      return player;
    });
  };

  const generateGameCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const canCreateGame = hostName.trim() !== '' && players.every(player => player.name.trim() !== '');
  const canJoinGame = joinCode.trim() !== '';

  const handleCreateGame = async () => {
    if (!canCreateGame) return;
    
    // Validate all player names
    const invalidPlayer = players.find((player, index) => {
      const validation = validatePlayerName(player.name);
      if (!validation.isValid) {
        toast({
          title: "Invalid Player Name",
          description: `Player ${index + 1}: ${validation.error}`,
          variant: "destructive",
        });
        return true;
      }
      return false;
    });
    
    if (invalidPlayer) return;
    
    setIsLoading(true);
    try {
      const gameCode = generateGameCode();
      const playersWithRoles = assignRandomRoles(players);
      
      // Create game session
      const { data: gameSession, error: sessionError } = await supabase
        .from('game_sessions')
        .insert({
          game_code: gameCode,
          host_name: hostName,
          status: 'waiting'
        })
        .select()
        .single();

      if (sessionError) throw sessionError;

      // Create player records
      const playerRecords = playersWithRoles.map((player, index) => ({
        game_session_id: gameSession.id,
        player_name: player.name,
        player_role: player.role,
        player_order: index,
        is_host: index === 0
      }));

      const { error: playersError } = await supabase
        .from('game_players')
        .insert(playerRecords);

      if (playersError) throw playersError;

      toast({
        title: "Game Created!",
        description: `Game code: ${gameCode}`,
      });

      onStartGame(playersWithRoles, gameCode, gameSession.id);
    } catch (error) {
      console.error('Error creating game:', error);
      toast({
        title: "Error",
        description: "Failed to create game. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinGame = async () => {
    if (!canJoinGame) return;
    
    // Validate game code
    const validation = validateGameCode(joinCode);
    if (!validation.isValid) {
      toast({
        title: "Invalid Game Code",
        description: validation.error,
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);
    try {
      // Find game session
      const { data: gameSession, error: sessionError } = await supabase
        .from('game_sessions')
        .select('*')
        .eq('game_code', validation.sanitized)
        .eq('status', 'waiting')
        .single();

      if (sessionError) throw new Error('Game not found or already started');

      // Get existing players
      const { data: existingPlayers, error: playersError } = await supabase
        .from('game_players')
        .select('*')
        .eq('game_session_id', gameSession.id)
        .order('player_order');

      if (playersError) throw playersError;

      // Convert to our Player format
      const gamePlayers: Player[] = existingPlayers.map(p => ({
        id: p.id,
        name: p.player_name,
        role: p.player_role as Player['role']
      }));

      toast({
        title: "Joined Game!",
        description: `Connected to game ${validation.sanitized}`,
      });

      onStartGame(gamePlayers, validation.sanitized, gameSession.id);
    } catch (error) {
      console.error('Error joining game:', error);
      toast({
        title: "Error",
        description: "Failed to join game. Check the code and try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
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
              Cooperative multiplayer board game for learning Continuous Delivery and DevOps practices
            </p>
          </div>
        </div>

        {/* Game Mode Selection */}
        <div className="flex gap-4 mb-6">
          <Button
            variant={gameMode === 'create' ? 'default' : 'outline'}
            onClick={() => setGameMode('create')}
            className="flex-1"
          >
            <Users className="w-4 h-4 mr-2" />
            Create Game
          </Button>
          <Button
            variant={gameMode === 'join' ? 'default' : 'outline'}
            onClick={() => setGameMode('join')}
            className="flex-1"
          >
            <GamepadIcon className="w-4 h-4 mr-2" />
            Join Game
          </Button>
        </div>

        {gameMode === 'create' ? (
          /* Create Game */
          <Card className="bg-gradient-card shadow-card animate-slide-in">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-6 h-6 text-primary" />
                Create New Game
              </CardTitle>
              <CardDescription>
                Set up a new multiplayer game and share the code with your team
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Host Name */}
              <div className="space-y-2">
                <Label htmlFor="host-name" className="text-base font-medium">
                  Your Name (Host)
                </Label>
                <Input
                  id="host-name"
                  placeholder="Enter your name"
                  value={hostName}
                  onChange={(e) => setHostName(e.target.value)}
                />
              </div>

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
                  onClick={handleCreateGame}
                  disabled={!canCreateGame || isLoading}
                  className="w-full bg-gradient-primary hover:opacity-90 transition-opacity"
                  size="lg"
                >
                  <Play className="w-5 h-5 mr-2" />
                  {isLoading ? 'Creating Game...' : 'Create Game'}
                </Button>
                {!canCreateGame && (
                  <p className="text-muted-foreground text-sm mt-2 text-center">
                    Please enter your name and names for all players
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          /* Join Game */
          <Card className="bg-gradient-card shadow-card animate-slide-in">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GamepadIcon className="w-6 h-6 text-primary" />
                Join Existing Game
              </CardTitle>
              <CardDescription>
                Enter the game code provided by the host to join
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="join-code" className="text-base font-medium">
                  Game Code
                </Label>
                <Input
                  id="join-code"
                  placeholder="Enter 6-character game code"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  maxLength={6}
                  className="text-center text-2xl font-mono tracking-wider"
                />
              </div>

              <Button
                onClick={handleJoinGame}
                disabled={!canJoinGame || isLoading}
                className="w-full bg-gradient-primary hover:opacity-90 transition-opacity"
                size="lg"
              >
                <GamepadIcon className="w-5 h-5 mr-2" />
                {isLoading ? 'Joining Game...' : 'Join Game'}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};