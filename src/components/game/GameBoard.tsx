import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuditLogger } from "@/hooks/useAuditLogger";
import { 
  Code, 
  Shield, 
  Rocket, 
  BarChart3, 
  Users, 
  Target,
  Clock,
  AlertTriangle,
  CheckCircle,
  GamepadIcon
} from "lucide-react";

interface Player {
  id: string;
  name: string;
  role: 'Developer' | 'QA Engineer' | 'DevOps Engineer' | 'Product Owner' | 'Security Engineer' | 'Site Reliability Engineer';
}

interface GameBoardProps {
  players: Player[];
  gameCode: string;
  gameSessionId: string;
  onEndGame: () => void;
}

interface PipelineStage {
  id: string;
  name: string;
  icon: React.ElementType;
  progress: number;
  maxProgress: number;
  color: string;
  description: string;
}

interface Challenge {
  id: string;
  title: string;
  description: string;
  type: 'bug' | 'security' | 'performance' | 'feature';
  difficulty: 1 | 2 | 3;
  assignedPlayer?: string;
}

const PIPELINE_STAGES: PipelineStage[] = [
  {
    id: 'development',
    name: 'Development',
    icon: Code,
    progress: 0,
    maxProgress: 10,
    color: 'bg-pipeline-dev text-pipeline-dev-foreground',
    description: 'Write and commit code'
  },
  {
    id: 'testing',
    name: 'Testing',
    icon: Shield,
    progress: 0,
    maxProgress: 8,
    color: 'bg-pipeline-test text-pipeline-test-foreground',
    description: 'Automated and manual testing'
  },
  {
    id: 'deployment',
    name: 'Deployment',
    icon: Rocket,
    progress: 0,
    maxProgress: 6,
    color: 'bg-pipeline-deploy text-pipeline-deploy-foreground',
    description: 'Deploy to production'
  },
  {
    id: 'monitoring',
    name: 'Monitoring',
    icon: BarChart3,
    progress: 0,
    maxProgress: 12,
    color: 'bg-pipeline-monitor text-pipeline-monitor-foreground',
    description: 'Monitor and maintain'
  }
];

const SAMPLE_CHALLENGES: Challenge[] = [
  {
    id: '1',
    title: 'Critical Bug in Production',
    description: 'A memory leak is causing application crashes. Requires immediate hotfix.',
    type: 'bug',
    difficulty: 3
  },
  {
    id: '2',
    title: 'Security Vulnerability',
    description: 'Dependency scanner found a high-severity vulnerability in a third-party library.',
    type: 'security',
    difficulty: 2
  },
  {
    id: '3',
    title: 'New Feature Request',
    description: 'Product team requests a new API endpoint for mobile app integration.',
    type: 'feature',
    difficulty: 2
  },
  {
    id: '4',
    title: 'Performance Degradation',
    description: 'Response times have increased by 40%. Database optimization needed.',
    type: 'performance',
    difficulty: 3
  }
];

const CHALLENGE_COLORS = {
  bug: 'bg-error text-error-foreground',
  security: 'bg-warning text-warning-foreground',
  performance: 'bg-pipeline-monitor text-pipeline-monitor-foreground',
  feature: 'bg-success text-success-foreground'
};

export const GameBoard = ({ players, gameCode, gameSessionId, onEndGame }: GameBoardProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { logGameEvent } = useAuditLogger();
  const [currentTurn, setCurrentTurn] = useState(0);
  const [pipelineStages, setPipelineStages] = useState(PIPELINE_STAGES);
  const [challenges, setChallenges] = useState(SAMPLE_CHALLENGES);
  const [gameScore, setGameScore] = useState(0);
  const [turnCount, setTurnCount] = useState(1);
  const [gameStartTime] = useState(new Date());

  // Log game start event when component mounts
  useEffect(() => {
    logGameEvent('start', gameSessionId, {
      gameCode,
      totalPlayers: players.length,
      playerRoles: players.map(p => p.role),
      startTime: gameStartTime.toISOString()
    });
  }, []);

  const currentPlayer = players[currentTurn];
  const totalProgress = pipelineStages.reduce((sum, stage) => sum + stage.progress, 0);
  const maxTotalProgress = pipelineStages.reduce((sum, stage) => sum + stage.maxProgress, 0);
  const overallProgress = (totalProgress / maxTotalProgress) * 100;

  const nextTurn = () => {
    const nextTurnIndex = (currentTurn + 1) % players.length;
    setCurrentTurn(nextTurnIndex);
    if (nextTurnIndex === 0) {
      setTurnCount(prev => prev + 1);
    }
  };

  const assignChallenge = (challengeId: string, playerId: string) => {
    setChallenges(prev => 
      prev.map(challenge => 
        challenge.id === challengeId 
          ? { ...challenge, assignedPlayer: playerId }
          : challenge
      )
    );
  };

  const completeChallenge = (challengeId: string) => {
    const challenge = challenges.find(c => c.id === challengeId);
    if (challenge) {
      setGameScore(prev => prev + challenge.difficulty * 10);
      setChallenges(prev => prev.filter(c => c.id !== challengeId));
    }
  };

  const saveGameHistory = async () => {
    if (!user) return;

    try {
      const gameDuration = Math.round((new Date().getTime() - gameStartTime.getTime()) / (1000 * 60));
      const completedStages = pipelineStages.filter(stage => stage.progress >= stage.maxProgress).length;
      
      const { error } = await supabase
        .from('game_history')
        .insert({
          user_id: user.id,
          game_session_id: gameSessionId,
          final_score: gameScore,
          turns_completed: turnCount,
          pipeline_stage_reached: completedStages,
          game_duration_minutes: gameDuration,
        });

      if (error) {
        console.error('Error saving game history:', error);
      } else {
        toast({
          title: "Game Saved",
          description: "Your game has been saved to your history!",
        });
      }
    } catch (error) {
      console.error('Error saving game history:', error);
    }
  };

  const handleEndGame = async () => {
    // Log game end event
    await logGameEvent('end', gameSessionId, {
      gameCode,
      finalScore: gameScore,
      turnsCompleted: turnCount,
      gameDurationMinutes: Math.round((new Date().getTime() - gameStartTime.getTime()) / (1000 * 60)),
      totalPlayers: players.length,
      pipelineProgress: pipelineStages.reduce((sum, stage) => sum + stage.progress, 0)
    });
    
    await saveGameHistory();
    onEndGame();
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="container mx-auto max-w-7xl">
        {/* Game Header */}
        <div className="mb-6 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              DevOps Pipeline Game
            </h1>
            <div className="flex items-center gap-4 mt-2">
              <Badge variant="outline" className="flex items-center gap-1">
                <GamepadIcon className="w-4 h-4" />
                Game: {gameCode}
              </Badge>
              <Badge variant="outline" className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                Turn {turnCount}
              </Badge>
              <Badge variant="outline" className="flex items-center gap-1">
                <Target className="w-4 h-4" />
                Score: {gameScore}
              </Badge>
            </div>
          </div>
          <Button variant="outline" onClick={handleEndGame}>
            End Game
          </Button>
        </div>

        {/* Current Player */}
        <Card className="mb-6 bg-gradient-card shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Current Turn: {currentPlayer.name}
            </CardTitle>
            <CardDescription>
              Playing as {currentPlayer.role}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={nextTurn} className="bg-gradient-primary">
              End Turn
            </Button>
          </CardContent>
        </Card>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Pipeline Stages */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="bg-gradient-card shadow-card">
              <CardHeader>
                <CardTitle>DevOps Pipeline Progress</CardTitle>
                <CardDescription>
                  Work together to advance through all stages
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Overall Progress</span>
                    <span className="text-sm text-muted-foreground">
                      {Math.round(overallProgress)}%
                    </span>
                  </div>
                  <Progress value={overallProgress} className="h-3" />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {pipelineStages.map((stage) => {
                    const Icon = stage.icon;
                    const stageProgress = (stage.progress / stage.maxProgress) * 100;
                    
                    return (
                      <Card key={stage.id} className="border-border/50">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3 mb-3">
                            <div className={`p-2 rounded-lg ${stage.color}`}>
                              <Icon className="w-5 h-5" />
                            </div>
                            <div>
                              <h3 className="font-semibold">{stage.name}</h3>
                              <p className="text-sm text-muted-foreground">
                                {stage.description}
                              </p>
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-sm">Progress</span>
                              <span className="text-sm font-medium">
                                {stage.progress}/{stage.maxProgress}
                              </span>
                            </div>
                            <Progress value={stageProgress} className="h-2" />
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Active Challenges */}
            <Card className="bg-gradient-card shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-warning" />
                  Active Challenges
                </CardTitle>
                <CardDescription>
                  Collaborate to solve these DevOps challenges
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {challenges.map((challenge) => (
                    <Card key={challenge.id} className="border-border/50">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-semibold">{challenge.title}</h4>
                              <Badge className={CHALLENGE_COLORS[challenge.type]}>
                                {challenge.type}
                              </Badge>
                              <Badge variant="outline">
                                Difficulty: {challenge.difficulty}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mb-3">
                              {challenge.description}
                            </p>
                            
                            {challenge.assignedPlayer ? (
                              <div className="flex items-center gap-2">
                                <Badge variant="secondary">
                                  Assigned to {players.find(p => p.id === challenge.assignedPlayer)?.name}
                                </Badge>
                                <Button
                                  size="sm"
                                  onClick={() => completeChallenge(challenge.id)}
                                  className="bg-success hover:bg-success/90"
                                >
                                  <CheckCircle className="w-4 h-4 mr-1" />
                                  Complete
                                </Button>
                              </div>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => assignChallenge(challenge.id, currentPlayer.id)}
                              >
                                Take Challenge
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Team Panel */}
          <div className="space-y-6">
            <Card className="bg-gradient-card shadow-card">
              <CardHeader>
                <CardTitle>Team Members</CardTitle>
                <CardDescription>
                  Your DevOps team working together
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {players.map((player, index) => (
                    <div
                      key={player.id}
                      className={`p-3 rounded-lg border ${
                        index === currentTurn 
                          ? 'border-primary shadow-glow bg-primary/5' 
                          : 'border-border/50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold">{player.name}</h4>
                          <p className="text-sm text-muted-foreground">{player.role}</p>
                        </div>
                        {index === currentTurn && (
                          <Badge className="bg-primary text-primary-foreground animate-pulse-glow">
                            Active
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};