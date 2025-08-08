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
  Users,
  Crown,
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
    
    // Start with 3 random tasks for turn 1, increase for later turns
    const tasksToShow = Math.min(3 + (turnNumber - 1), 5);
    const allAvailableTasks = [...pendingTasks, ...availableChallenges.filter(c => !pendingTasks.some(p => p.id === c.id))];
    const randomTasks = allAvailableTasks
      .sort(() => Math.random() - 0.5)
      .slice(0, tasksToShow);
    
    setCurrentTasks(randomTasks);
    setShowVotingPopup(true);
  };

  // Handle voting completion
  const completeVoting = (selectedTaskId: string) => {
    setShowVotingPopup(false);
    
    // For now, just select the most voted task
    const selected = currentTasks.filter(task => task.id === selectedTaskId);
    const unselected = currentTasks.filter(task => task.id !== selectedTaskId);
    
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
          {isHost && (
            <Button variant="outline" onClick={handleEndGame}>
              End Game
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Sidebar - Always Visible Performance */}
          <div className="lg:col-span-1 space-y-4">
            {/* Business Metrics - Compact */}
            <Card className="bg-gradient-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Business
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Income</span>
                  <span className="text-sm font-bold text-primary">{businessMetrics.businessIncome}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Security</span>
                  <span className="text-sm font-bold text-primary">{businessMetrics.securityScore}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Performance</span>
                  <span className="text-sm font-bold text-primary">{businessMetrics.performanceScore}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Reputation</span>
                  <span className="text-sm font-bold text-primary">{businessMetrics.reputation}%</span>
                </div>
              </CardContent>
            </Card>

            {/* DevOps Metrics - Compact */}
            <Card className="bg-gradient-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  DevOps
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Deploy Freq</span>
                  <span className="text-sm font-bold text-primary">{devOpsMetrics.deploymentFrequency}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Lead Time</span>
                  <span className="text-sm font-bold text-primary">{devOpsMetrics.leadTime}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">MTTR</span>
                  <span className="text-sm font-bold text-primary">{devOpsMetrics.mttr}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Success Rate</span>
                  <span className="text-sm font-bold text-primary">{devOpsMetrics.changeFailureRate}</span>
                </div>
              </CardContent>
            </Card>

            {/* Active Consequences - Always Visible */}
            <Card className="border-warning bg-warning/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2 text-warning">
                  <AlertTriangle className="w-4 h-4" />
                  Active Issues
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {activeConsequences.length > 0 ? (
                  <div className="space-y-2">
                    {activeConsequences.map((consequence, index) => (
                      <div key={index} className="p-2 rounded bg-muted/30 border border-warning/20">
                        <div className="text-xs font-medium text-warning">{consequence.description}</div>
                        <div className="text-xs text-muted-foreground mt-1">{consequence.impact}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground text-center py-4">
                    No active issues
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-3 space-y-6">

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

            {/* Facilitator Controls - Only visible to host */}
            {isHost && (
              <Card className="bg-gradient-primary/10 border-primary/20">
                <CardHeader>
                  <CardTitle className="text-lg font-medium flex items-center gap-2">
                    <Crown className="w-5 h-5 text-primary" />
                    Facilitator Controls
                  </CardTitle>
                  <CardDescription>
                    Advance the game through its phases
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {currentPhase === 'start_turn' && (
                    <Button 
                      onClick={startVoting}
                      className="w-full bg-gradient-primary text-white hover:opacity-90"
                      size="lg"
                    >
                      Start Team Voting - Turn {turnNumber}
                    </Button>
                  )}

                  {currentPhase === 'execution' && selectedTasks.length > 0 && (
                    <Button 
                      onClick={executeSelectedTasks}
                      className="w-full bg-gradient-primary text-white hover:opacity-90"
                      size="lg"
                    >
                      Process Task Results
                    </Button>
                  )}

                  {currentPhase === 'end_turn' && (
                    <Button 
                      onClick={endTurn}
                      className="w-full bg-gradient-primary text-white hover:opacity-90"
                      size="lg"
                    >
                      Begin Turn {turnNumber + 1}
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Team Member Status - What they should do */}
            {!isHost && (
              <Card className="bg-secondary/10 border-secondary/20">
                <CardHeader>
                  <CardTitle className="text-lg font-medium flex items-center gap-2">
                    <Users className="w-5 h-5 text-secondary" />
                    Team Member Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {currentPhase === 'start_turn' && (
                    <div className="text-center">
                      <p className="text-muted-foreground">Waiting for facilitator to start voting...</p>
                    </div>
                  )}
                  {currentPhase === 'voting' && (
                    <div className="text-center">
                      <p className="text-primary font-medium">🗳️ Voting is now open!</p>
                      <p className="text-sm text-muted-foreground">Select the most important task to prioritize</p>
                    </div>
                  )}
                  {currentPhase === 'events' && (
                    <div className="text-center">
                      <p className="text-muted-foreground">Processing random event...</p>
                    </div>
                  )}
                  {currentPhase === 'execution' && (
                    <div className="text-center">
                      <p className="text-primary font-medium">⚙️ Working on selected tasks</p>
                      <p className="text-sm text-muted-foreground">Complete your assigned work</p>
                    </div>
                  )}
                  {currentPhase === 'end_turn' && (
                    <div className="text-center">
                      <p className="text-muted-foreground">Turn complete. Waiting for next turn...</p>
                    </div>
                  )}
                </CardContent>
              </Card>
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

            {/* Team Roster */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  Team Roster
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2">
                  {players.filter(player => player.role).map((player, index) => (
                    <div key={player.id} className="flex items-center justify-between p-3 bg-card/50 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-muted-foreground">#{index + 1}</span>
                        <span className="font-medium">{player.name}</span>
                      </div>
                      {player.role && (
                        <Badge variant="secondary">
                          {player.role}
                        </Badge>
                      )}
                    </div>
                  ))}
                  {players.filter(player => player.role).length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No team members active
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <VotingPopup
          isOpen={showVotingPopup}
          onClose={() => setShowVotingPopup(false)}
          challenges={currentTasks}
          onVoteSubmit={(mostImportant) => {
            completeVoting(mostImportant);
          }}
        />
      </div>
    </div>
  );
};