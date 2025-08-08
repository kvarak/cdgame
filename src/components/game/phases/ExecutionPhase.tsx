import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Target } from "lucide-react";
import { GameState, Challenge } from "@/lib/gameEngine/GameStateEngine";

const CHALLENGE_COLORS: Record<string, string> = {
  deployment: "bg-blue-100 text-blue-800 border-blue-300",
  security: "bg-red-100 text-red-800 border-red-300",
  performance: "bg-green-100 text-green-800 border-green-300",
  monitoring: "bg-yellow-100 text-yellow-800 border-yellow-300",
  testing: "bg-purple-100 text-purple-800 border-purple-300"
};

interface ExecutionPhaseProps {
  gameState: GameState;
  onCompleteTask: (taskId: string) => void;
  onEndTurn: () => void;
}

export const ExecutionPhase = ({ gameState, onCompleteTask, onEndTurn }: ExecutionPhaseProps) => {
  const { selectedTasks, isHost } = gameState;

  if (isHost) {
    return (
      <Card className="bg-gradient-primary/10 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            Execute Selected Tasks
          </CardTitle>
        </CardHeader>
        <CardContent>
          {selectedTasks.length === 0 ? (
            <div className="text-center py-6">
              <div className="p-4 bg-warning/10 border border-warning/20 rounded mb-4">
                <p className="text-warning font-medium">No tasks were selected!</p>
                <p className="text-sm text-muted-foreground mt-1">
                  This may indicate a voting issue. Check the vote completion logic.
                </p>
              </div>
              <Button onClick={onEndTurn} variant="outline">
                End Turn (Skip Execution)
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground mb-4">
                Mark tasks as completed when the team finishes them
              </p>
              
              {selectedTasks.map((task) => (
                <Card key={task.id} className="border-success bg-success/5">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-medium">{task.title}</h4>
                          <Badge className={CHALLENGE_COLORS[task.type]} variant="outline">
                            {task.type}
                          </Badge>
                          <Badge variant="outline">
                            Difficulty: {task.difficulty}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{task.description}</p>
                      </div>
                      <Button 
                        onClick={() => onCompleteTask(task.id)}
                        className="ml-4 bg-success hover:bg-success/90"
                        size="sm"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Complete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              <div className="pt-4 border-t">
                <Button 
                  onClick={onEndTurn} 
                  className="w-full bg-gradient-primary text-white"
                  size="lg"
                >
                  End Turn & Continue
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Team member view
  return (
    <Card>
      <CardContent className="p-6">
        <div className="text-center py-6">
          <div className="w-12 h-12 bg-success/20 rounded-full flex items-center justify-center mx-auto mb-3">
            <Target className="w-6 h-6 text-success" />
          </div>
          <h3 className="text-base font-semibold mb-2">Execution Phase</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Working on the selected task(s)
          </p>
          
          {selectedTasks.length === 0 ? (
            <div className="p-3 bg-warning/10 rounded border border-warning/20">
              <p className="text-warning font-medium text-sm">No tasks selected</p>
              <p className="text-xs text-muted-foreground mt-1">
                Waiting for facilitator to end turn
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {selectedTasks.map((task) => (
                <div key={task.id} className="p-3 bg-success/10 rounded border border-success/20">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium text-sm">{task.title}</h4>
                    <Badge className={CHALLENGE_COLORS[task.type]} variant="outline">
                      {task.type}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{task.description}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};