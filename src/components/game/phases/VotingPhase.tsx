import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { GameState, Challenge } from "@/lib/gameEngine/GameStateEngine";

const CHALLENGE_COLORS: Record<string, string> = {
  deployment: "bg-blue-100 text-blue-800 border-blue-300",
  security: "bg-red-100 text-red-800 border-red-300",
  performance: "bg-green-100 text-green-800 border-green-300",
  monitoring: "bg-yellow-100 text-yellow-800 border-yellow-300",
  testing: "bg-purple-100 text-purple-800 border-purple-300"
};

interface VotingPhaseProps {
  gameState: GameState;
  onSubmitVote: (taskId: string) => void;
  onCompleteVoting: () => void;
  isTaskRecommended: (task: Challenge, role?: string) => boolean;
}

export const VotingPhase = ({ 
  gameState, 
  onSubmitVote, 
  onCompleteVoting,
  isTaskRecommended 
}: VotingPhaseProps) => {
  const { 
    currentTasks, 
    playerVotes, 
    players, 
    currentPlayerName, 
    isHost 
  } = gameState;

  const teamMembers = players.filter(player => player.role);
  const currentPlayer = players.find(player => player.name === currentPlayerName);
  const hasVoted = currentPlayerName in playerVotes;
  const votesReceived = Object.keys(playerVotes).length;
  const totalVoters = teamMembers.length;
  const isTeamMember = teamMembers.some(member => member.name === currentPlayerName);

  if (isHost) {
    return (
      <Card className="bg-gradient-primary/10 border-primary/20">
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="text-center">
              <p className="text-primary font-medium">Team Voting in Progress</p>
              <p className="text-sm text-muted-foreground">
                Waiting for team members to vote on priorities
              </p>
            </div>
            
            {/* Voting Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Votes Received</span>
                <span>{votesReceived} / {totalVoters}</span>
              </div>
              <Progress 
                value={(votesReceived / Math.max(totalVoters, 1)) * 100} 
                className="w-full h-2"
              />
            </div>

            {/* Current Tasks Display */}
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Available Tasks:</h4>
              {currentTasks.map((task) => (
                <div key={task.id} className="p-2 rounded bg-muted/30 border">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">{task.title}</span>
                    <Badge className={CHALLENGE_COLORS[task.type]} variant="outline">
                      {task.type}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{task.description}</p>
                </div>
              ))}
            </div>

            {/* Complete Voting Button */}
            {votesReceived === totalVoters && totalVoters > 0 && (
              <Button 
                onClick={onCompleteVoting}
                className="w-full bg-gradient-primary text-white hover:opacity-90"
              >
                Process Votes & Continue
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Team member view
  return (
    <Card>
      <CardContent className="p-6">
        {!isTeamMember ? (
          <div className="text-center py-6">
            <div className="w-12 h-12 bg-muted/20 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-2xl">👁️</span>
            </div>
            <h3 className="text-base font-semibold mb-2">Spectating</h3>
            <p className="text-sm text-muted-foreground">
              Watching team members vote on priorities
            </p>
          </div>
        ) : hasVoted ? (
          <div className="text-center py-6">
            <div className="w-12 h-12 bg-success/20 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-lg">✓</span>
            </div>
            <h3 className="text-base font-semibold mb-2">Vote Submitted!</h3>
            <p className="text-sm text-muted-foreground">
              Waiting for other team members to vote...
            </p>
            <div className="mt-4">
              <Progress 
                value={(votesReceived / Math.max(totalVoters, 1)) * 100} 
                className="w-full h-2"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {votesReceived} / {totalVoters} votes received
              </p>
            </div>
          </div>
        ) : currentTasks.length > 0 ? (
          <div className="space-y-4">
            <div className="text-center mb-4">
              <h3 className="text-base font-semibold mb-2">🗳️ Vote for Priority</h3>
              <p className="text-sm text-muted-foreground">
                Select the most important task to prioritize this turn
              </p>
            </div>
            
            {/* Voting Interface */}
            <div className="space-y-2">
              {currentTasks.map((task) => {
                const isRecommended = isTaskRecommended(task, currentPlayer?.role);
                
                return (
                  <Card 
                    key={task.id}
                    className={`cursor-pointer border transition-all hover:bg-primary/5 hover:border-primary/50 ${
                      isRecommended ? 'border-success bg-success/5' : ''
                    }`}
                    onClick={() => onSubmitVote(task.id)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h4 className="font-medium text-sm">{task.title}</h4>
                            <Badge className={CHALLENGE_COLORS[task.type]} variant="outline">
                              {task.type}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              Difficulty: {task.difficulty}
                            </Badge>
                            {isRecommended && (
                              <Badge variant="default" className="bg-success text-success-foreground">
                                Recommended
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">{task.description}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="text-center py-6">
            <p className="text-sm text-muted-foreground">
              Waiting for tasks to be loaded...
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};