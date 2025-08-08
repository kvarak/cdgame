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
  Target,
  Clock,
  AlertTriangle,
  CheckCircle,
  GamepadIcon,
  TrendingUp,
  TrendingDown,
  Shield,
  Zap,
  DollarSign,
  Star
} from "lucide-react";
import { VotingPopup } from "./VotingPopup";

interface Player {
  id: string;
  name: string;
  role: 'Developer' | 'QA Engineer' | 'DevOps Engineer' | 'Product Owner' | 'Security Engineer' | 'Site Reliability Engineer' | 'Manager' | 'CEO' | 'Random';
}

interface GameBoardProps {
  players: Player[];
  gameCode: string;
  gameSessionId: string;
  onEndGame: () => void;
  isHost?: boolean;
  currentPlayerName?: string;
}

interface Challenge {
  id: string;
  title: string;
  description: string;
  type: 'bug' | 'security' | 'performance' | 'feature';
  difficulty: 1 | 2 | 3;
  required_strengths?: string[];
  preferred_strengths?: string[];
}

const CHALLENGE_COLORS = {
  bug: 'bg-error text-error-foreground',
  security: 'bg-warning text-warning-foreground',
  performance: 'bg-pipeline-monitor text-pipeline-monitor-foreground',
  feature: 'bg-success text-success-foreground'
};

export const GameBoard = ({ players, gameCode, gameSessionId, onEndGame, isHost = true, currentPlayerName }: GameBoardProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { logGameEvent } = useAuditLogger();
  const [loadedChallenges, setLoadedChallenges] = useState<Challenge[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [currentChallenges, setCurrentChallenges] = useState<Challenge[]>([]);
  const [turnNumber, setTurnNumber] = useState(1);
  const [gameStartTime] = useState(new Date());
  const [showVotingPopup, setShowVotingPopup] = useState(false);
  const [currentPhase, setCurrentPhase] = useState<'planning' | 'voting' | 'execution' | 'complete'>('planning');
  const [votes, setVotes] = useState<Record<string, { most_important: string; least_important: string }>>({});
  const [votingResults, setVotingResults] = useState<{ challenge: Challenge; votes: number }[]>([]);
  const [selectedChallenges, setSelectedChallenges] = useState<Challenge[]>([]);
  const [completedChallenges, setCompletedChallenges] = useState<string[]>([]);
  const [businessMetrics, setBusinessMetrics] = useState({
    income: 100,
    securityRisk: 0,
    performanceScore: 100,
    reputation: 100
  });
  const [devOpsMetrics, setDevOpsMetrics] = useState({
    deploymentFrequency: 50,
    leadTime: 50,
    mttr: 50,
    changeFailureRate: 50
  });

  // Load challenges from tasks.ndjson
  useEffect(() => {
    const loadChallenges = async () => {
      try {
        const response = await fetch('/tasks.ndjson');
        const text = await response.text();
        const tasks = text.trim().split('\n').map(line => JSON.parse(line));
        setLoadedChallenges(tasks);
      } catch (error) {
        console.error('Error loading challenges:', error);
        setLoadedChallenges([]);
      }
    };
    loadChallenges();
  }, []);
  
  // Update challenges when loaded challenges change
  useEffect(() => {
    if (loadedChallenges.length > 0) {
      setChallenges(loadedChallenges);
    }
  }, [loadedChallenges]);

  const handleStartVoting = () => {
    // Show only 5 random challenges for voting
    const availableChallenges = challenges.filter(challenge => 
      !completedChallenges.includes(challenge.id)
    );
    const randomChallenges = availableChallenges
      .sort(() => 0.5 - Math.random())
      .slice(0, 5);
    
    setCurrentChallenges(randomChallenges);
    setShowVotingPopup(true);
    setCurrentPhase('voting');
    toast({
      title: "Turn Started", 
      description: "Select priorities for this turn",
    });
  };

  const handleVotingComplete = (results: { challenge: Challenge; votes: number }[]) => {
    setVotingResults(results);
    setCurrentPhase('execution');
    setShowVotingPopup(false);
    
    // Select top challenges based on votes
    const sortedResults = results.sort((a, b) => b.votes - a.votes);
    const topChallenges = sortedResults.slice(0, Math.min(3, sortedResults.length));
    setSelectedChallenges(topChallenges.map(r => r.challenge));
    
    // Handle consequences for unselected challenges
    handleUnselectedChallenges(currentChallenges, topChallenges.map(r => r.challenge));
    
    toast({
      title: "Turn Priorities Set",
      description: `Selected ${topChallenges.length} priorities for execution`,
    });
  };

  const handleUnselectedChallenges = (allChallenges: Challenge[], selected: Challenge[]) => {
    const unselected = allChallenges.filter(c => !selected.find(s => s.id === c.id));
    let newMetrics = { ...businessMetrics };
    
    unselected.forEach(challenge => {
      switch (challenge.type) {
        case 'bug':
          // Bugs come back until fixed - no immediate consequence but they persist
          break;
        case 'feature':
          // 50% chance to come back
          if (Math.random() > 0.5) {
            // Remove from challenges pool (won't come back)
            setChallenges(prev => prev.filter(c => c.id !== challenge.id));
          }
          break;
        case 'performance':
          // Reduce income by 1-5%
          const reduction = Math.floor(Math.random() * 5) + 1;
          newMetrics.income = Math.max(0, newMetrics.income - reduction);
          newMetrics.performanceScore = Math.max(0, newMetrics.performanceScore - 10);
          break;
        case 'security':
          // Increase security risk
          newMetrics.securityRisk = Math.min(100, newMetrics.securityRisk + 20);
          break;
      }
    });
    
    setBusinessMetrics(newMetrics);
  };

  const handleEndTurn = () => {
    // End of turn consequences
    let newMetrics = { ...businessMetrics };
    
    // Security hack chance (10% per unresolved security issue)
    if (newMetrics.securityRisk > 0 && Math.random() < 0.1 * (newMetrics.securityRisk / 20)) {
      const hackDamage = Math.floor(Math.random() * 20) + 10;
      newMetrics.income = Math.max(0, newMetrics.income - hackDamage);
      newMetrics.reputation = Math.max(0, newMetrics.reputation - 15);
      toast({
        title: "Security Breach!",
        description: `Company suffered a security incident. Income reduced by ${hackDamage}%`,
        variant: "destructive"
      });
    }
    
    setBusinessMetrics(newMetrics);
    setTurnNumber(prev => prev + 1);
    setCurrentPhase('planning');
    setSelectedChallenges([]);
    setVotingResults([]);
    setVotes({});
    
    toast({
      title: "Turn Complete",
      description: `Starting Turn ${turnNumber + 1}`,
    });
  };

  const handleCompleteChallenge = (challengeId: string) => {
    setCompletedChallenges(prev => [...prev, challengeId]);
    
    // Improve metrics based on challenge type
    const challenge = selectedChallenges.find(c => c.id === challengeId);
    if (challenge) {
      let newBusinessMetrics = { ...businessMetrics };
      let newDevOpsMetrics = { ...devOpsMetrics };
      
      switch (challenge.type) {
        case 'security':
          newBusinessMetrics.securityRisk = Math.max(0, newBusinessMetrics.securityRisk - 20);
          newBusinessMetrics.reputation = Math.min(100, newBusinessMetrics.reputation + 5);
          break;
        case 'performance':
          newBusinessMetrics.performanceScore = Math.min(100, newBusinessMetrics.performanceScore + 15);
          newDevOpsMetrics.mttr = Math.min(100, newDevOpsMetrics.mttr + 10);
          break;
        case 'bug':
          newBusinessMetrics.reputation = Math.min(100, newBusinessMetrics.reputation + 3);
          newDevOpsMetrics.changeFailureRate = Math.min(100, newDevOpsMetrics.changeFailureRate + 5);
          break;
        case 'feature':
          newBusinessMetrics.income = Math.min(200, newBusinessMetrics.income + 5);
          newDevOpsMetrics.deploymentFrequency = Math.min(100, newDevOpsMetrics.deploymentFrequency + 5);
          break;
      }
      
      setBusinessMetrics(newBusinessMetrics);
      setDevOpsMetrics(newDevOpsMetrics);
    }
    
    toast({
      title: "Task Completed!",
      description: "Great work! Metrics improved.",
    });
  };

  const handleEndGame = async () => {
    // Log game end event
    await logGameEvent('end', gameSessionId, {
      gameCode,
      turnsCompleted: turnNumber,
      gameDurationMinutes: Math.round((new Date().getTime() - gameStartTime.getTime()) / (1000 * 60)),
      totalPlayers: players.length,
      finalBusinessMetrics: businessMetrics,
      finalDevOpsMetrics: devOpsMetrics
    });
    
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
                Turn {turnNumber}
              </Badge>
            </div>
          </div>
          <Button variant="outline" onClick={handleEndGame}>
            End Game
          </Button>
        </div>

        <div className="space-y-6">
          {/* Business Metrics */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Business Performance</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-primary" />
                    <div>
                      <div className="text-2xl font-bold text-primary">{businessMetrics.income}%</div>
                      <div className="text-sm text-muted-foreground">Income</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-error" />
                    <div>
                      <div className="text-2xl font-bold text-error">{businessMetrics.securityRisk}%</div>
                      <div className="text-sm text-muted-foreground">Security Risk</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Zap className="w-5 h-5 text-primary" />
                    <div>
                      <div className="text-2xl font-bold text-primary">{businessMetrics.performanceScore}%</div>
                      <div className="text-sm text-muted-foreground">Performance</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Star className="w-5 h-5 text-primary" />
                    <div>
                      <div className="text-2xl font-bold text-primary">{businessMetrics.reputation}%</div>
                      <div className="text-sm text-muted-foreground">Reputation</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* DevOps Metrics */}
          <div>
            <h3 className="text-lg font-semibold mb-3">DevOps Performance</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-primary">{devOpsMetrics.deploymentFrequency}</div>
                  <div className="text-sm text-muted-foreground">Deploy Frequency</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-primary">{devOpsMetrics.leadTime}</div>
                  <div className="text-sm text-muted-foreground">Lead Time</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-primary">{devOpsMetrics.mttr}</div>
                  <div className="text-sm text-muted-foreground">MTTR</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-primary">{devOpsMetrics.changeFailureRate}</div>
                  <div className="text-sm text-muted-foreground">Change Success</div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Turn Controls */}
          {currentPhase === 'planning' && (
            <div className="mb-6">
              <Button 
                onClick={handleStartVoting}
                className="w-full bg-gradient-primary text-white hover:opacity-90"
                size="lg"
              >
                Start Turn Planning
              </Button>
            </div>
          )}

          {currentPhase === 'execution' && selectedChallenges.length > 0 && (
            <div className="mb-6">
              <Button 
                onClick={handleEndTurn}
                className="w-full bg-gradient-primary text-white hover:opacity-90"
                size="lg"
              >
                End Turn
              </Button>
            </div>
          )}

          {/* Selected Challenges for Execution */}
          {currentPhase === 'execution' && selectedChallenges.length > 0 && (
            <Card className="bg-gradient-card shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-primary" />
                  Turn Execution - Active Priorities
                </CardTitle>
                <CardDescription>
                  Work on the selected priorities
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {selectedChallenges.map((challenge) => {
                    const isCompleted = completedChallenges.includes(challenge.id);
                    
                    return (
                      <Card 
                        key={challenge.id} 
                        className={`border-border/50 ${isCompleted ? 'opacity-50' : ''}`}
                      >
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
                                {isCompleted && (
                                  <Badge className="bg-success text-success-foreground">
                                    Completed
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground mb-3">
                                {challenge.description}
                              </p>
                              
                              {!isCompleted && (
                                <Button
                                  size="sm"
                                  onClick={() => handleCompleteChallenge(challenge.id)}
                                  className="bg-success hover:bg-success/90"
                                >
                                  <CheckCircle className="w-4 h-4 mr-1" />
                                  Complete Task
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Team Panel */}
          <Card className="bg-gradient-card shadow-card">
            <CardHeader>
              <CardTitle>Team Members</CardTitle>
              <CardDescription>
                Your DevOps team working together
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {players.map((player) => (
                  <div
                    key={player.id}
                    className="p-3 rounded-lg border border-border/50"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold">{player.name}</h4>
                        <p className="text-sm text-muted-foreground">{player.role}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <VotingPopup
          isOpen={showVotingPopup}
          onClose={() => setShowVotingPopup(false)}
          challenges={currentChallenges}
          onVoteSubmit={(most, least) => {
            // Simple vote handling for now
            const results = currentChallenges.map(c => ({ challenge: c, votes: Math.floor(Math.random() * 10) }));
            handleVotingComplete(results);
          }}
        />
      </div>
    </div>
  );
};