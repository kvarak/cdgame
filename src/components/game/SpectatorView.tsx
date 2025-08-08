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

  // Listen for sprint state changes
  useEffect(() => {
    if (!(gameSession as any)?.current_sprint_state) return;
    
    const state = (gameSession as any).current_sprint_state;
    setSprintState(state);
    
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
            {sprintState?.voting_active ? (
              hasVoted ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-success/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl">✓</span>
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Vote Submitted</h3>
                  <p className="text-muted-foreground">
                    Waiting for other players to vote...
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="text-center">
                    <h3 className="text-lg font-semibold mb-2">Next Priorities Voting</h3>
                    <p className="text-muted-foreground mb-4">
                      Vote on which challenges are most and least important for next priorities
                    </p>
                  </div>
                  
                  {/* Inline Voting Interface */}
                  <div className="space-y-4">
                    <h4 className="font-medium">Available Challenges:</h4>
                    {sprintState.selected_challenges?.map((challengeId: string) => {
                      const challenge = allChallenges.find(c => c.id === challengeId);
                      if (!challenge) return null;
                      
                      const isRecommended = challenge.required_strengths?.some(strength => 
                        playerStrengths.includes(strength)
                      ) || challenge.preferred_strengths?.some(strength => 
                        playerStrengths.includes(strength)
                      );
                      
                      return (
                        <div key={challengeId} className={`p-3 border rounded-lg ${isRecommended ? 'border-primary bg-primary/5' : ''}`}>
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h5 className="font-medium">{challenge.title}</h5>
                              <p className="text-sm text-muted-foreground mt-1">{challenge.description}</p>
                              {isRecommended && (
                                <Badge variant="outline" className="mt-2 text-primary border-primary">
                                  Good match for your strengths
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    
                    <div className="flex gap-2 pt-4">
                      <Button 
                        onClick={() => {
                          // Simple voting - vote for first challenge as most important
                          const firstChallenge = sprintState.selected_challenges?.[0];
                          const lastChallenge = sprintState.selected_challenges?.[sprintState.selected_challenges.length - 1];
                          if (firstChallenge && lastChallenge) {
                            handleVoteSubmit(firstChallenge, lastChallenge);
                          }
                        }}
                        className="bg-gradient-primary flex-1"
                      >
                        Submit Vote
                      </Button>
                    </div>
                  </div>
                </div>
              )
            ) : (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-muted/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Target className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Waiting for Priority Planning</h3>
                <p className="text-muted-foreground">
                  The host is selecting challenges for the next priorities
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

      </div>
    </div>
  );
};