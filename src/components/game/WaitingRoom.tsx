import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Copy, Users, Play, UserPlus, Crown, Settings } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useGameRoom, GamePlayer } from "@/hooks/useGameRoom";
import { useAuth } from "@/hooks/useAuth";

interface WaitingRoomProps {
  gameSessionId: string;
  isHost: boolean;
  currentPlayerName: string;
  onStartGame: (players: GamePlayer[], gameCode: string, gameSessionId: string) => void;
  onLeaveGame: () => void;
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

export const WaitingRoom = ({ 
  gameSessionId, 
  isHost, 
  currentPlayerName, 
  onStartGame, 
  onLeaveGame 
}: WaitingRoomProps) => {
  const { gameSession, players, loading, error, updatePlayerRole, startGame } = useGameRoom(gameSessionId);
  const { toast } = useToast();
  const { user } = useAuth();
  const [isStarting, setIsStarting] = useState(false);

  const copyGameCode = async () => {
    if (gameSession?.gameCode) {
      await navigator.clipboard.writeText(gameSession.gameCode);
      toast({
        title: "Game Code Copied!",
        description: "Share this code with your team members",
      });
    }
  };

  const handleRoleChange = async (playerName: string, newRole: GamePlayer['role']) => {
    try {
      await updatePlayerRole(playerName, newRole);
      toast({
        title: "Role Updated",
        description: `${playerName}'s role changed to ${newRole}`,
      });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  const handleStartGame = async () => {
    if (!gameSession || players.length < 2) {
      toast({
        title: "Cannot Start Game",
        description: "Need at least 2 players to start the game",
        variant: "destructive",
      });
      return;
    }

    setIsStarting(true);
    try {
      await startGame();
      onStartGame(players, gameSession.gameCode, gameSessionId);
    } catch (err: any) {
      toast({
        title: "Error Starting Game",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsStarting(false);
    }
  };

  const currentPlayer = players.find(p => p.name === currentPlayerName);
  const canChangeRole = (player: GamePlayer) => {
    return player.name === currentPlayerName || isHost;
  };

  if (loading && !gameSession) {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading game room...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="text-error">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={onLeaveGame} variant="outline" className="w-full">
              Back to Setup
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="container mx-auto max-w-4xl">
        {/* Room Header */}
        <Card className="mb-6 bg-gradient-card shadow-card">
          <CardHeader>
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
              <div>
                <CardTitle className="flex items-center gap-2 text-2xl">
                  <Users className="w-6 h-6 text-primary" />
                  Game Waiting Room
                  {isHost && <Crown className="w-5 h-5 text-warning" />}
                </CardTitle>
                <CardDescription className="text-lg">
                  Host: {gameSession?.hostName} • {players.length}/{gameSession?.maxPlayers} players
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button onClick={onLeaveGame} variant="outline">
                  Leave Game
                </Button>
                {isHost && (
                  <Button 
                    onClick={handleStartGame}
                    disabled={players.length < 2 || isStarting}
                    className="bg-gradient-primary hover:opacity-90"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    {isStarting ? 'Starting...' : 'Start Game'}
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Game Code Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-primary" />
                Invite Players
              </CardTitle>
              <CardDescription>
                Share this code with your team members
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="game-code">Game Code</Label>
                <div className="flex gap-2">
                  <Input
                    id="game-code"
                    value={gameSession?.gameCode || ''}
                    readOnly
                    className="text-center text-2xl font-mono tracking-wider"
                  />
                  <Button onClick={copyGameCode} size="icon" variant="outline">
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              
              {user && (
                <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                  💡 <strong>Tip:</strong> Other players can join by entering this code on the main page
                </div>
              )}
            </CardContent>
          </Card>

          {/* Game Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-primary" />
                Game Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label className="text-muted-foreground">Max Players</Label>
                  <p className="font-medium">{gameSession?.maxPlayers}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Current Players</Label>
                  <p className="font-medium">{players.length}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Status</Label>
                  <Badge variant="secondary">{gameSession?.status}</Badge>
                </div>
                <div>
                  <Label className="text-muted-foreground">Ready to Start</Label>
                  <p className="font-medium">{players.length >= 2 ? '✅ Yes' : '❌ Need 2+ players'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Players List */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Team Members ({players.length})
            </CardTitle>
            <CardDescription>
              Players can change their own roles. {isHost ? 'As host, you can change anyone\'s role.' : ''}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              {players.map((player, index) => (
                <div key={player.id} className="flex items-center justify-between p-4 border rounded-lg bg-card/50">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-muted-foreground">#{index + 1}</span>
                      {player.isHost && <Crown className="w-4 h-4 text-warning" />}
                    </div>
                    <div>
                      <p className="font-medium">{player.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Joined {new Date(player.joinedAt).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    {canChangeRole(player) ? (
                      <select
                        value={player.role}
                        onChange={(e) => handleRoleChange(player.name, e.target.value as GamePlayer['role'])}
                        className="px-3 py-1 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                      >
                        {AVAILABLE_ROLES.map(role => (
                          <option key={role} value={role}>{role}</option>
                        ))}
                      </select>
                    ) : (
                      <Badge className={ROLE_COLORS[player.role]}>
                        {player.role}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
              
              {players.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <UserPlus className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Waiting for players to join...</p>
                  <p className="text-sm">Share the game code above to invite players</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};