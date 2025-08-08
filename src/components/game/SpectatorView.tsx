import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Crown, Eye, Users, Target } from "lucide-react";
import { useGameRoom } from "@/hooks/useGameRoom";
import { VotingPopup } from "./VotingPopup";

interface Challenge {
  id: string;
  title: string;
  description: string;
  type: 'bug' | 'security' | 'performance' | 'feature';
  difficulty: 1 | 2 | 3;
}

interface SpectatorViewProps {
  gameSessionId: string;
  currentPlayerName: string;
  gameCode: string;
  onLeaveGame: () => void;
  selectedChallenges?: Challenge[];
  onVoteSubmit?: (mostImportant: string, leastImportant: string) => void;
  showVotingPopup?: boolean;
  onCloseVoting?: () => void;
}

export const SpectatorView = ({ 
  gameSessionId, 
  currentPlayerName, 
  gameCode,
  onLeaveGame,
  selectedChallenges = [],
  onVoteSubmit,
  showVotingPopup = false,
  onCloseVoting
}: SpectatorViewProps) => {
  const { gameSession, players } = useGameRoom(gameSessionId);
  const [hasVoted, setHasVoted] = useState(false);

  const hostPlayer = players.find(p => p.isHost);
  const currentPlayer = players.find(p => p.name === currentPlayerName);

  const handleVoteSubmit = (mostImportant: string, leastImportant: string) => {
    setHasVoted(true);
    onVoteSubmit?.(mostImportant, leastImportant);
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="container mx-auto max-w-2xl">
        {/* Header */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Eye className="w-5 h-5 text-primary" />
                  Spectator Mode
                </CardTitle>
                <CardDescription>
                  Game: {gameCode} • Host: {hostPlayer?.name}
                </CardDescription>
              </div>
              <Button onClick={onLeaveGame} variant="outline" size="sm">
                Leave Game
              </Button>
            </div>
          </CardHeader>
        </Card>

        {/* Secret Voting Section */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" />
              Secret Voting & Game Interactions
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedChallenges.length > 0 ? (
              hasVoted ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-success/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl">✓</span>
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Vote Submitted</h3>
                  <p className="text-muted-foreground">
                    Waiting for other team members to vote...
                  </p>
                </div>
              ) : (
                <div className="text-center py-6">
                  <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Crown className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Sprint Voting Active</h3>
                  <p className="text-muted-foreground mb-4">
                    Vote on which challenges are most and least important for this sprint
                  </p>
                  <Button 
                    onClick={() => {/* Will be handled by popup */}} 
                    className="bg-gradient-primary"
                  >
                    Cast Your Vote
                  </Button>
                </div>
              )
            ) : (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-muted/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Target className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Waiting for Sprint Planning</h3>
                <p className="text-muted-foreground">
                  The host is selecting challenges for the next sprint
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
              Team ({players.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {players.map((player) => (
                <div key={player.id} className="flex items-center justify-between p-2 rounded border">
                  <div className="flex items-center gap-2">
                    {player.isHost && <Crown className="w-4 h-4 text-warning" />}
                    <span>{player.name}</span>
                  </div>
                  <Badge variant="outline">
                    {player.role}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Voting Popup */}
        <VotingPopup
          isOpen={showVotingPopup}
          challenges={selectedChallenges}
          onVoteSubmit={handleVoteSubmit}
          onClose={onCloseVoting || (() => {})}
        />
      </div>
    </div>
  );
};