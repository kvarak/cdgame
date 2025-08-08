import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  DollarSign,
  Shield,
  Zap,
  Star,
  CalendarDays,
} from "lucide-react";
import { VotingPopup } from "./VotingPopup";

interface Player {
  id: string;
  name: string;
  role?: 'Developer' | 'QA Engineer' | 'DevOps Engineer' | 'Product Owner' | 'Security Engineer' | 'Site Reliability Engineer' | 'Random';
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

interface GameEvent {
  id: string;
  name: string;
  description: string;
  effect: string;
  severity: number;
  duration: number;
}

interface TaskConsequence {
  type: 'bug' | 'feature' | 'performance' | 'security';
  description: string;
  impact: string;
}

// Game flow phases: start_turn -> voting -> events -> execution -> end_turn
type GamePhase = 'start_turn' | 'voting' | 'events' | 'execution' | 'end_turn';

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

  // Game state
  const [currentPhase, setCurrentPhase] = useState<GamePhase>('start_turn');
  const [turnNumber, setTurnNumber] = useState(1);
  const [gameStartTime] = useState(new Date());

  // Challenges and events
  const [availableChallenges, setAvailableChallenges] = useState<Challenge[]>([]);
  const [currentTasks, setCurrentTasks] = useState<Challenge[]>([]);
  const [selectedTasks, setSelectedTasks] = useState<Challenge[]>([]);
  const [unselectedTasks, setUnselectedTasks] = useState<Challenge[]>([]);
  const [completedTasks, setCompletedTasks] = useState<string[]>([]);
  const [pendingTasks, setPendingTasks] = useState<Challenge[]>([]);

  // Events
  const [availableEvents, setAvailableEvents] = useState<GameEvent[]>([]);
  const [currentEvent, setCurrentEvent] = useState<GameEvent | null>(null);
  const [activeConsequences, setActiveConsequences] = useState<TaskConsequence[]>([]);

  // UI state
  const [showVotingPopup, setShowVotingPopup] = useState(false);

  // Metrics
  const [businessMetrics, setBusinessMetrics] = useState({
    businessIncome: 100,
    securityScore: 100,
    performanceScore: 100,
    reputation: 100
  });

  const [devOpsMetrics, setDevOpsMetrics] = useState({
    deploymentFrequency: 50,
    leadTime: 50,
    mttr: 50,
    changeFailureRate: 50
  });

  // Load game data
  useEffect(() => {
    const loadChallenges = async () => {
      try {
        const response = await fetch('/tasks.ndjson');
        const text = await response.text();
        const tasks = text.trim().split('\n').map(line => JSON.parse(line));
        setAvailableChallenges(tasks);
      } catch (error) {
        console.error('Error loading challenges:', error);
      }
    };

    const loadEvents = async () => {
      try {
        const response = await fetch('/events.ndjson');
        const text = await response.text();
        const events = text.trim().split('\n').map(line => JSON.parse(line));
        setAvailableEvents(events);
      } catch (error) {
        console.error('Failed to load events:', error);
      }
    };

    loadChallenges();
    loadEvents();
  }, []);

  // Start voting phase
  const startVoting = () => {
    setCurrentPhase('voting');
    
    // Generate 5 random tasks (including pending ones)
    const allAvailableTasks = [...pendingTasks, ...availableChallenges.filter(c => !pendingTasks.some(p => p.id === c.id))];
    const randomTasks = allAvailableTasks
      .sort(() => Math.random() - 0.5)
      .slice(0, 5);
    
    setCurrentTasks(randomTasks);
    setShowVotingPopup(true);
  };

  // Handle voting completion
  const completeVoting = (selectedTaskIds: string[]) => {
    setShowVotingPopup(false);
    
    // Update selected tasks based on voting results
    const selected = currentTasks.filter(task => selectedTaskIds.includes(task.id));
    const unselected = currentTasks.filter(task => !selectedTaskIds.includes(task.id));
    
    setSelectedTasks(selected);
    setUnselectedTasks(unselected);
    
    // Move to events phase
    startEvents();
  };

  // Start events phase
  const startEvents = () => {
    if (availableEvents.length === 0) {
      // Skip events if none loaded, go to execution
      setCurrentPhase('execution');
      return;
    }
    
    // Select random event
    const randomEvent = availableEvents[Math.floor(Math.random() * availableEvents.length)];
    setCurrentEvent(randomEvent);
    setCurrentPhase('events');
  };

  // Apply event effects
  const applyEventEffects = (event: GameEvent) => {
    switch (event.effect) {
      case 'reduce_income':
        setBusinessMetrics(prev => ({
          ...prev,
          businessIncome: Math.max(0, prev.businessIncome - event.severity)
        }));
        break;
      case 'increase_income':
        setBusinessMetrics(prev => ({
          ...prev,
          businessIncome: prev.businessIncome + event.severity
        }));
        break;
      case 'reduce_velocity':
        setDevOpsMetrics(prev => ({
          ...prev,
          deploymentFrequency: Math.max(0, prev.deploymentFrequency - event.severity)
        }));
        break;
      case 'block_deployment':
        // Skip deployment this turn
        break;
      case 'emergency_task':
        // Add emergency task to next turn
        break;
    }
  };

  // Complete events phase
  const completeEvents = () => {
    if (currentEvent) {
      applyEventEffects(currentEvent);
      toast({
        title: "Event Applied",
        description: currentEvent.description,
        variant: currentEvent.effect.includes('reduce') ? 'destructive' : 'default'
      });
    }
    setCurrentEvent(null);
    setCurrentPhase('execution');
  };

  // Apply consequences for unselected tasks
  const applyTaskConsequences = (unselectedTasks: Challenge[]) => {
    const newConsequences: TaskConsequence[] = [];
    const newPendingTasks = [...pendingTasks];
    
    unselectedTasks.forEach(task => {
      switch (task.type) {
        case 'bug':
          // Bugs that aren't fixed come back until fixed
          if (!newPendingTasks.some(p => p.id === task.id)) {
            newPendingTasks.push(task);
          }
          newConsequences.push({
            type: 'bug',
            description: `Bug "${task.title}" remains unfixed`,
            impact: 'Customer complaints increase, reputation damage'
          });
          break;
          
        case 'feature':
          // Features have 50% chance to come back
          if (Math.random() < 0.5) {
            newPendingTasks.push(task);
            newConsequences.push({
              type: 'feature',
              description: `Feature "${task.title}" still requested by customers`,
              impact: 'Market opportunity may be lost'
            });
          }
          break;
          
        case 'performance':
          // Performance issues reduce income
          const performanceLoss = Math.floor(Math.random() * 5) + 1;
          setBusinessMetrics(prev => ({
            ...prev,
            businessIncome: Math.max(0, prev.businessIncome - performanceLoss)
          }));
          newConsequences.push({
            type: 'performance',
            description: `Performance issue "${task.title}" causes ${performanceLoss}% income loss`,
            impact: `Revenue reduced by ${performanceLoss}%`
          });
          break;
          
        case 'security':
          // Security issues come back and have 10% chance of hack each turn
          if (!newPendingTasks.some(p => p.id === task.id)) {
            newPendingTasks.push(task);
          }
          if (Math.random() < 0.1) {
            const securityLoss = Math.floor(Math.random() * 20) + 10;
            setBusinessMetrics(prev => ({
              ...prev,
              businessIncome: Math.max(0, prev.businessIncome - securityLoss),
              securityScore: Math.max(0, prev.securityScore - 15)
            }));
            newConsequences.push({
              type: 'security',
              description: `Security breach! "${task.title}" vulnerability exploited`,
              impact: `${securityLoss}% income lost, major security incident`
            });
          } else {
            newConsequences.push({
              type: 'security',
              description: `Security vulnerability "${task.title}" remains unpatched`,
              impact: 'High risk of security breach next turn'
            });
          }
          break;
      }
    });
    
    setPendingTasks(newPendingTasks);
    setActiveConsequences(prev => [...prev, ...newConsequences]);
  };

  // Execute selected tasks
  const executeSelectedTasks = () => {
    // Clear old consequences and apply new ones
    setActiveConsequences([]);
    applyTaskConsequences(unselectedTasks);
    
    // Remove completed tasks from pending tasks
    const updatedPendingTasks = pendingTasks.filter(task => !selectedTasks.some(selected => selected.id === task.id));
    setPendingTasks(updatedPendingTasks);
    
    setCurrentPhase('end_turn');
  };

  // Complete a task
  const handleCompleteTask = (taskId: string) => {
    setCompletedTasks(prev => [...prev, taskId]);
    
    // Improve metrics based on task type
    const task = selectedTasks.find(t => t.id === taskId);
    if (task) {
      switch (task.type) {
        case 'security':
          setBusinessMetrics(prev => ({
            ...prev,
            securityScore: Math.min(100, prev.securityScore + 15),
            reputation: Math.min(100, prev.reputation + 5)
          }));
          break;
        case 'performance':
          setBusinessMetrics(prev => ({
            ...prev,
            performanceScore: Math.min(100, prev.performanceScore + 15)
          }));
          setDevOpsMetrics(prev => ({
            ...prev,
            mttr: Math.min(100, prev.mttr + 10)
          }));
          break;
        case 'bug':
          setBusinessMetrics(prev => ({
            ...prev,
            reputation: Math.min(100, prev.reputation + 5)
          }));
          setDevOpsMetrics(prev => ({
            ...prev,
            changeFailureRate: Math.min(100, prev.changeFailureRate + 5)
          }));
          break;
        case 'feature':
          setBusinessMetrics(prev => ({
            ...prev,
            businessIncome: Math.min(200, prev.businessIncome + 5)
          }));
          setDevOpsMetrics(prev => ({
            ...prev,
            deploymentFrequency: Math.min(100, prev.deploymentFrequency + 5)
          }));
          break;
      }
      
      toast({
        title: "Task Completed!",
        description: `${task.title} completed successfully!`,
      });
    }
  };

  // End turn
  const endTurn = () => {
    setTurnNumber(prev => prev + 1);
    setCurrentPhase('start_turn');
    setSelectedTasks([]);
    setUnselectedTasks([]);
    setCurrentTasks([]);
    setCompletedTasks([]);
    setCurrentEvent(null);
    
    toast({
      title: "Turn Complete",
      description: `Starting Turn ${turnNumber + 1}`,
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
              <Badge variant="outline" className="flex items-center gap-1">
                <CalendarDays className="w-4 h-4" />
                Phase: {currentPhase.replace('_', ' ')}
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
                      <div className="text-2xl font-bold text-primary">{businessMetrics.businessIncome}%</div>
                      <div className="text-sm text-muted-foreground">Income</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-primary" />
                    <div>
                      <div className="text-2xl font-bold text-primary">{businessMetrics.securityScore}%</div>
                      <div className="text-sm text-muted-foreground">Security Score</div>
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

          {/* Active Consequences */}
          {activeConsequences.length > 0 && (
            <Card className="border-warning bg-warning/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-warning">
                  <AlertTriangle className="w-5 h-5" />
                  Active Consequences
                </CardTitle>
                <CardDescription>
                  Impact from previous unaddressed tasks
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {activeConsequences.map((consequence, index) => (
                    <div key={index} className="p-3 rounded-lg bg-muted/50">
                      <div className="font-medium text-sm">{consequence.description}</div>
                      <div className="text-xs text-muted-foreground">{consequence.impact}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Current Event */}
          {currentPhase === 'events' && currentEvent && (
            <Card className="border-warning bg-warning/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-warning" />
                  Random Event: {currentEvent.name}
                </CardTitle>
                <CardDescription>
                  An unexpected event has occurred that affects your team
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm mb-4">{currentEvent.description}</p>
                <Button onClick={completeEvents} className="w-full">
                  Acknowledge Event
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Phase Controls */}
          {currentPhase === 'start_turn' && (
            <div className="mb-6">
              <Button 
                onClick={startVoting}
                className="w-full bg-gradient-primary text-white hover:opacity-90"
                size="lg"
              >
                Start Turn {turnNumber} - Select Priorities
              </Button>
            </div>
          )}

          {currentPhase === 'execution' && selectedTasks.length > 0 && (
            <div className="mb-6">
              <Button 
                onClick={executeSelectedTasks}
                className="w-full bg-gradient-primary text-white hover:opacity-90"
                size="lg"
              >
                Execute Selected Tasks
              </Button>
            </div>
          )}

          {currentPhase === 'end_turn' && (
            <div className="mb-6">
              <Button 
                onClick={endTurn}
                className="w-full bg-gradient-primary text-white hover:opacity-90"
                size="lg"
              >
                Complete Turn {turnNumber}
              </Button>
            </div>
          )}

          {/* Selected Tasks for Execution */}
          {currentPhase === 'execution' && selectedTasks.length > 0 && (
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
                  {selectedTasks.map((task) => {
                    const isCompleted = completedTasks.includes(task.id);
                    
                    return (
                      <Card 
                        key={task.id} 
                        className={`border-border/50 ${isCompleted ? 'opacity-50' : ''}`}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h4 className="font-semibold">{task.title}</h4>
                                <Badge className={CHALLENGE_COLORS[task.type]}>
                                  {task.type}
                                </Badge>
                                <Badge variant="outline">
                                  Difficulty: {task.difficulty}
                                </Badge>
                                {isCompleted && (
                                  <Badge className="bg-success text-success-foreground">
                                    Completed
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground mb-3">
                                {task.description}
                              </p>
                              
                              {!isCompleted && (
                                <Button
                                  size="sm"
                                  onClick={() => handleCompleteTask(task.id)}
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
                        {player.role ? (
                          <p className="text-sm text-muted-foreground">{player.role}</p>
                        ) : (
                          <Badge variant="secondary" className="text-xs">Host</Badge>
                        )}
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
          challenges={currentTasks}
          onVoteSubmit={(most, least) => {
            // Simple vote handling - select top 3 most voted
            const voteCounts = new Map<string, number>();
            currentTasks.forEach(task => {
              voteCounts.set(task.id, Math.floor(Math.random() * 10) + 1);
            });
            
            const sortedTasks = currentTasks.sort((a, b) => 
              (voteCounts.get(b.id) || 0) - (voteCounts.get(a.id) || 0)
            );
            
            const selectedIds = sortedTasks.slice(0, 3).map(task => task.id);
            completeVoting(selectedIds);
          }}
        />
      </div>
    </div>
  );
};