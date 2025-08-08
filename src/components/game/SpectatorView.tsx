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
}

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
  const [hasVoted, setHasVoted] = useState(false);
  const [sprintState, setSprintState] = useState<any>(null);
  const [showVotingPopup, setShowVotingPopup] = useState(false);

  const hostPlayer = players.find(p => p.isHost);
  const currentPlayer = players.find(p => p.name === currentPlayerName);

  // Listen for sprint state changes
  useEffect(() => {
    if (!(gameSession as any)?.current_sprint_state) return;
    
    const state = (gameSession as any).current_sprint_state;
    setSprintState(state);
    
    // Show voting popup when voting becomes active
    if (state.voting_active && !hasVoted) {
      setShowVotingPopup(true);
    }
  }, [(gameSession as any)?.current_sprint_state, hasVoted]);

  // Real-time subscription to game session changes
  useEffect(() => {
    if (!gameSessionId) return;

    const channel = supabase
      .channel('game-session-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'game_sessions',
          filter: `id=eq.${gameSessionId}`
        },
        (payload) => {
          console.log('Game session updated:', payload.new);
          if (payload.new.current_sprint_state) {
            const state = payload.new.current_sprint_state;
            setSprintState(state);
            
            // Show voting popup when voting becomes active
            if (state.voting_active && !hasVoted) {
              setShowVotingPopup(true);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [gameSessionId, hasVoted]);

  const handleVoteSubmit = async (mostImportant: string, leastImportant: string) => {
    try {
      const { error } = await supabase.rpc('submit_player_vote', {
        p_session_id: gameSessionId,
        p_player_name: currentPlayerName,
        p_most_important: mostImportant,
        p_least_important: leastImportant
      });

      if (error) {
        console.error('Error submitting vote:', error);
        return;
      }

      setHasVoted(true);
      setShowVotingPopup(false);
    } catch (error) {
      console.error('Error submitting vote:', error);
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

        {/* Secret Voting Section */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" />
              Secret Voting & Game Interactions
            </CardTitle>
          </CardHeader>
          <CardContent>
            {sprintState?.voting_active ? (
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
                    onClick={() => setShowVotingPopup(true)} 
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
          challenges={sprintState?.selected_challenges?.map((id: string) => {
            // Mock challenges for now - in real app this would come from database
            const mockChallenges = [
              { id: '1', title: 'Critical Bug in Production', description: 'Memory leak causing crashes', type: 'bug' as const, difficulty: 3 as const },
              { id: '2', title: 'Security Vulnerability', description: 'High-severity dependency issue', type: 'security' as const, difficulty: 2 as const },
              { id: '3', title: 'New Feature Request', description: 'API endpoint for mobile app', type: 'feature' as const, difficulty: 2 as const },
              { id: '4', title: 'Performance Degradation', description: 'Response times increased 40%', type: 'performance' as const, difficulty: 3 as const }
            ];
            return mockChallenges.find(c => c.id === id);
          }).filter(Boolean) || []}
          onVoteSubmit={handleVoteSubmit}
          onClose={() => setShowVotingPopup(false)}
        />
      </div>
    </div>
  );
};