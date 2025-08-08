import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Crown, Eye, Users, Monitor, Target } from "lucide-react";
import { useGameRoom } from "@/hooks/useGameRoom";

interface SpectatorViewProps {
  gameSessionId: string;
  currentPlayerName: string;
  gameCode: string;
  onLeaveGame: () => void;
}

export const SpectatorView = ({ 
  gameSessionId, 
  currentPlayerName, 
  gameCode,
  onLeaveGame 
}: SpectatorViewProps) => {
  const { gameSession, players } = useGameRoom(gameSessionId);

  const hostPlayer = players.find(p => p.isHost);
  const currentPlayer = players.find(p => p.name === currentPlayerName);

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="container mx-auto max-w-4xl">
        {/* Header */}
        <Card className="mb-6 bg-gradient-card shadow-card">
          <CardHeader>
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
              <div>
                <CardTitle className="flex items-center gap-2 text-2xl">
                  <Eye className="w-6 h-6 text-primary" />
                  Spectator Mode
                  <Badge variant="secondary" className="ml-2">Game In Progress</Badge>
                </CardTitle>
                <CardDescription className="text-lg">
                  Game Code: {gameCode} • You're watching {hostPlayer?.name}'s screen
                </CardDescription>
              </div>
              <Button onClick={onLeaveGame} variant="outline">
                Leave Game
              </Button>
            </div>
          </CardHeader>
        </Card>

        {/* Secret Voting and Interactions */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-6 h-6 text-primary" />
                Secret Voting & Game Interactions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-primary/10 border border-primary/20 rounded-lg p-6">
                <h3 className="text-xl font-semibold mb-4 text-center">
                  King of the Castle Mode
                </h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-card p-4 rounded-lg border">
                    <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center mx-auto mb-2">
                      <span className="text-primary font-bold">👑</span>
                    </div>
                    <h4 className="font-medium mb-1 text-center">Vote for Priority</h4>
                    <p className="text-sm text-muted-foreground text-center">
                      During sprint planning, vote for the most important challenge
                    </p>
                  </div>
                  
                  <div className="bg-card p-4 rounded-lg border">
                    <div className="w-8 h-8 bg-warning/20 rounded-lg flex items-center justify-center mx-auto mb-2">
                      <span className="text-warning font-bold">⚡</span>
                    </div>
                    <h4 className="font-medium mb-1 text-center">Influence Decisions</h4>
                    <p className="text-sm text-muted-foreground text-center">
                      Your votes will secretly influence the game outcome
                    </p>
                  </div>
                </div>
                
                <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-center text-muted-foreground">
                    <strong>How it works:</strong> All players vote simultaneously on challenge priorities. 
                    The collective votes influence game events and outcomes in real-time.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Your Player Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                Your Role
              </CardTitle>
            </CardHeader>
            <CardContent>
              {currentPlayer && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{currentPlayer.name}</span>
                    <Badge className="bg-primary text-primary-foreground">
                      {currentPlayer.role}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    As a <strong>{currentPlayer.role}</strong>, you bring unique expertise to help the team make the best decisions during the game.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Team Members */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                Team Members ({players.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {players.map((player) => (
                  <div key={player.id} className="flex items-center justify-between p-2 rounded border bg-card/50">
                    <div className="flex items-center gap-2">
                      {player.isHost && <Crown className="w-4 h-4 text-warning" />}
                      <span className="font-medium">{player.name}</span>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {player.role}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* How to Participate - Moved to bottom */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Monitor className="w-6 h-6 text-primary" />
              How to Participate
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-6 text-center">
              <Crown className="w-12 h-12 text-warning mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">
                {hostPlayer?.name} is the Game Master
              </h3>
              <p className="text-muted-foreground mb-4">
                The host controls the entire game. You'll participate by watching their screen and providing input when needed.
              </p>
              
              <div className="grid md:grid-cols-2 gap-4 mt-6">
                <div className="bg-card p-4 rounded-lg border">
                  <Monitor className="w-8 h-8 text-primary mx-auto mb-2" />
                  <h4 className="font-medium mb-1">Watch the Host's Screen</h4>
                  <p className="text-sm text-muted-foreground">
                    Ask {hostPlayer?.name} to share their screen via Discord, Zoom, or Teams
                  </p>
                </div>
                
                <div className="bg-card p-4 rounded-lg border">
                  <Users className="w-8 h-8 text-primary mx-auto mb-2" />
                  <h4 className="font-medium mb-1">Collaborate as a Team</h4>
                  <p className="text-sm text-muted-foreground">
                    Discuss decisions together and help guide the host's actions
                  </p>
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-4 text-sm">
              <div className="bg-muted/50 p-3 rounded-lg">
                <strong className="text-primary">Step 1:</strong>
                <p className="mt-1">Join a video call with your team</p>
              </div>
              <div className="bg-muted/50 p-3 rounded-lg">
                <strong className="text-primary">Step 2:</strong>
                <p className="mt-1">Ask the host to share their screen</p>
              </div>
              <div className="bg-muted/50 p-3 rounded-lg">
                <strong className="text-primary">Step 3:</strong>
                <p className="mt-1">Collaborate and strategize together!</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};