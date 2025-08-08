import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Crown, Eye, Users, Target } from "lucide-react";
import { useGameRoom } from "@/hooks/useGameRoom";
import { VotingPopup } from "./VotingPopup";
import { supabase } from "@/integrations/supabase/client";

interface Challenge {
  id: string;
  title: string;
  description: string;
  type: 'bug' | 'security' | 'performance' | 'feature';
  difficulty: 1 | 2 | 3;
  required_strengths?: string[];
  preferred_strengths?: string[];
}

interface SpectatorViewProps {
  gameSessionId: string;
  currentPlayerName: string;
  gameCode: string;
  onLeaveGame: () => void;
  currentPhase?: string;
  currentTasks?: Challenge[];
  hasVoted?: boolean;
  onVoteSubmit?: (taskId: string) => void;
}

export const SpectatorView = ({ 
  gameSessionId, 
  currentPlayerName, 
  gameCode,
  onLeaveGame,
  currentPhase = 'start_turn',
  currentTasks = [],
  hasVoted = false,
  onVoteSubmit
}: SpectatorViewProps) => {
  const { gameSession, players } = useGameRoom(gameSessionId);
  const [showVotingPopup, setShowVotingPopup] = useState(false);
  const [currentPlayerRole, setCurrentPlayerRole] = useState<string>('');
  const [allChallenges, setAllChallenges] = useState<Challenge[]>([]);
  const [playerStrengths, setPlayerStrengths] = useState<string[]>([]);

  const hostPlayer = players.find(p => p.isHost);
  const currentPlayer = players.find(p => p.name === currentPlayerName);

  // Load roles and tasks data
  useEffect(() => {
    const loadGameData = async () => {
      try {
        const [rolesResponse, tasksResponse] = await Promise.all([
          fetch('/roles.ndjson'),
          fetch('/tasks.ndjson')
        ]);
        
        const rolesText = await rolesResponse.text();
        const tasksText = await tasksResponse.text();
        
        const roles = rolesText.trim().split('\n').map(line => JSON.parse(line));
        const tasks = tasksText.trim().split('\n').map(line => JSON.parse(line));
        
        setAllChallenges(tasks);
        
        // Set current player's role and strengths
        if (currentPlayer) {
          setCurrentPlayerRole(currentPlayer.role);
          const roleData = roles.find(r => r.name === currentPlayer.role);
          if (roleData) {
            setPlayerStrengths(roleData.strengths);
          }
        }
      } catch (error) {
        console.error('Error loading game data:', error);
      }
    };
    
    loadGameData();
  }, [currentPlayer]);

  // Show voting popup when voting phase starts and player hasn't voted
  useEffect(() => {
    if (currentPhase === 'voting' && !hasVoted && currentTasks.length > 0 && currentPlayer?.role) {
      setShowVotingPopup(true);
    } else {
      setShowVotingPopup(false);
    }
  }, [currentPhase, hasVoted, currentTasks.length, currentPlayer?.role]);

  const handleVoteSubmit = (taskId: string) => {
    if (onVoteSubmit) {
      onVoteSubmit(taskId);
      setShowVotingPopup(false);
    }
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

        {/* Player Role & Voting Section */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" />
              Secret Voting & Game Interactions
            </CardTitle>
            <CardDescription>
              Role: {currentPlayerRole} • Strengths: {playerStrengths.join(', ')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {currentPhase === 'start_turn' && (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-muted/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Target className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Waiting for Turn to Start</h3>
                <p className="text-muted-foreground">
                  The facilitator will start the voting phase shortly
                </p>
              </div>
            )}
            
            {currentPhase === 'voting' && !hasVoted && currentPlayer?.role && (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Target className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">🗳️ Voting Open!</h3>
                <p className="text-muted-foreground mb-4">
                  Select the most important task to prioritize this turn
                </p>
                <Button 
                  onClick={() => setShowVotingPopup(true)}
                  className="bg-gradient-primary"
                >
                  Cast Your Vote
                </Button>
              </div>
            )}
            
            {currentPhase === 'voting' && hasVoted && (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-success/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">✓</span>
                </div>
                <h3 className="text-lg font-semibold mb-2">Vote Submitted!</h3>
                <p className="text-muted-foreground">
                  Waiting for other team members to vote...
                </p>
              </div>
            )}
            
            {currentPhase === 'voting' && !currentPlayer?.role && (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-muted/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Eye className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Spectating</h3>
                <p className="text-muted-foreground">
                  Watching team members vote on priorities
                </p>
              </div>
            )}
            
            {currentPhase === 'events' && (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-warning/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Target className="w-8 h-8 text-warning" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Processing Events</h3>
                <p className="text-muted-foreground">
                  Handling random events that affect the team
                </p>
              </div>
            )}
            
            {currentPhase === 'execution' && (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-success/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Target className="w-8 h-8 text-success" />
                </div>
                <h3 className="text-lg font-semibold mb-2">⚙️ Execution Phase</h3>
                <p className="text-muted-foreground">
                  Team is working on selected priorities
                </p>
              </div>
            )}
            
            {currentPhase === 'end_turn' && (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-muted/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Target className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Turn Complete</h3>
                <p className="text-muted-foreground">
                  Waiting for next turn to begin
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Players */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Players ({players.length})
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

        <VotingPopup
          isOpen={showVotingPopup}
          onClose={() => setShowVotingPopup(false)}
          challenges={currentTasks}
          onVoteSubmit={handleVoteSubmit}
        />
      </div>
    </div>
  );
};