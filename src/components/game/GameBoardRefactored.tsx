import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Crown, DollarSign, Zap, AlertTriangle, CalendarDays, Users } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { GameStateEngine, GameState } from "@/lib/gameEngine/GameStateEngine";
import { TaskManager } from "@/lib/gameEngine/TaskManager";
import { EventManager } from "@/lib/gameEngine/EventManager";
import { PhaseManager } from "@/lib/gameEngine/PhaseManager";
import { VotingPhase } from "./phases/VotingPhase";
import { EventsPhase } from "./phases/EventsPhase";
import { ExecutionPhase } from "./phases/ExecutionPhase";
import { supabase } from '@/integrations/supabase/client';

interface Player {
  id: string;
  name: string;
  role?: string;
}

interface GameBoardProps {
  gameSessionId: string;
  gameCode: string;
  players: Player[];
  currentPlayerName: string;
  isHost: boolean;
  onLeaveGame?: () => void;
  onEndGame: () => void;
}

export const GameBoardRefactored = ({
  gameSessionId,
  gameCode,
  players,
  currentPlayerName,
  isHost,
  onLeaveGame,
  onEndGame
}: GameBoardProps) => {
  // Initialize game engine and managers
  const [gameEngine] = useState(() => new GameStateEngine({
    gameSessionId,
    gameCode,
    players,
    currentPlayerName,
    isHost,
    gameStartTime: new Date()
  }));

  const [taskManager] = useState(() => new TaskManager(gameEngine));
  const [eventManager] = useState(() => new EventManager(gameEngine));
  const [phaseManager] = useState(() => new PhaseManager(gameEngine, taskManager, eventManager));

  const [gameState, setGameState] = useState<GameState>(gameEngine.getState());
  const [showGameEndDialog, setShowGameEndDialog] = useState(false);

  // Subscribe to game state changes
  useEffect(() => {
    const unsubscribe = gameEngine.subscribe(setGameState);
    return unsubscribe;
  }, [gameEngine]);

  // Initialize data and real-time
  useEffect(() => {
    const initialize = async () => {
      await Promise.all([
        taskManager.loadChallenges(),
        eventManager.loadEvents(),
        gameEngine.initializeRealtime()
      ]);
    };

    initialize();

    return () => {
      gameEngine.cleanup();
    };
  }, [gameEngine, taskManager, eventManager]);

  // Handle vote submission
  const handleSubmitVote = async (taskId: string) => {
    taskManager.submitVote(currentPlayerName, taskId);
  };

  // Handle phase transitions (facilitator only)
  const handleStartVoting = async () => {
    if (!isHost) return;
    await phaseManager.startVoting();
  };

  const handleCompleteVoting = async () => {
    if (!isHost) return;
    await phaseManager.completeVoting(gameState.playerVotes);
  };

  const handleAcknowledgeEvent = () => {
    if (!isHost) return;
    phaseManager.completeEvents();
  };

  const handleCompleteTask = (taskId: string) => {
    if (!isHost) return;
    taskManager.completeTask(taskId);
  };

  const handleEndTurn = () => {
    if (!isHost) return;
    phaseManager.endTurn();
  };

  const handleEndGame = async () => {
    if (!isHost) return;

    try {
      const { error } = await supabase
        .from('game_sessions')
        .update({ status: 'ended' })
        .eq('id', gameSessionId);

      if (error) throw error;

      toast({
        title: "Game Ended",
        description: "The game has been ended successfully.",
      });
    } catch (error) {
      console.error('Error ending game:', error);
      toast({
        title: "Error",
        description: "Failed to end game",
        variant: "destructive"
      });
    }
  };

  // Real-time subscription for game end
  useEffect(() => {
    if (!gameSessionId) return;

    const channel = supabase
      .channel(`game-end-${gameSessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'game_sessions',
          filter: `id=eq.${gameSessionId}`
        },
        (payload) => {
          if (payload.new.status === 'ended') {
            setShowGameEndDialog(true);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [gameSessionId]);

  const teamMembers = players.filter(player => player.role);

  const renderPhaseContent = () => {
    switch (gameState.currentPhase) {
      case 'voting':
        return (
          <VotingPhase
            gameState={gameState}
            onSubmitVote={handleSubmitVote}
            onCompleteVoting={handleCompleteVoting}
            isTaskRecommended={taskManager.isTaskRecommended}
          />
        );

      case 'events':
        return (
          <EventsPhase
            gameState={gameState}
            onAcknowledgeEvent={handleAcknowledgeEvent}
          />
        );

      case 'execution':
        return (
          <ExecutionPhase
            gameState={gameState}
            onCompleteTask={handleCompleteTask}
            onEndTurn={handleEndTurn}
          />
        );

      default:
        // Start turn phase or others
        return (
          <Card>
            <CardContent className="p-6">
              <div className="text-center py-6">
                <div className="w-12 h-12 bg-muted/20 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Crown className="w-6 h-6 text-muted-foreground" />
                </div>
                <h3 className="text-base font-semibold mb-2">Waiting for Turn to Start</h3>
                <p className="text-sm text-muted-foreground">
                  The facilitator will start the voting phase shortly
                </p>
              </div>
            </CardContent>
          </Card>
        );
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="bg-gradient-card rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                DevOps Pipeline Game
              </h1>
              <div className="flex items-center gap-4 flex-wrap">
                <Badge variant="outline" className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  Game: {gameCode}
                </Badge>
                <Badge variant="outline" className="flex items-center gap-1">
                  <Crown className="w-4 h-4" />
                  Turn: {gameState.turnNumber}
                </Badge>
                <Badge variant="outline" className="flex items-center gap-1">
                  <CalendarDays className="w-4 h-4" />
                  Phase: {gameState.currentPhase.replace('_', ' ')}
                </Badge>
              </div>
            </div>
            <div className="flex gap-2">
              {!isHost && onLeaveGame && (
                <Button variant="outline" onClick={onLeaveGame}>
                  Leave Game
                </Button>
              )}
              {isHost && (
                <Button variant="outline" onClick={handleEndGame}>
                  End Game
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar - Only show for facilitator */}
          {isHost && (
            <div className="lg:col-span-1 space-y-4">
              {/* Business Metrics */}
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
                    <span className="text-sm font-bold text-primary">
                      {gameState.businessMetrics.businessIncome}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">Security</span>
                    <span className="text-sm font-bold text-primary">
                      {gameState.businessMetrics.securityScore}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">Performance</span>
                    <span className="text-sm font-bold text-primary">
                      {gameState.businessMetrics.performanceScore}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">Reputation</span>
                    <span className="text-sm font-bold text-primary">
                      {gameState.businessMetrics.reputation}%
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* DevOps Metrics */}
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
                    <span className="text-sm font-bold text-primary">
                      {gameState.devOpsMetrics.deploymentFrequency}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">Lead Time</span>
                    <span className="text-sm font-bold text-primary">
                      {gameState.devOpsMetrics.leadTime}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">MTTR</span>
                    <span className="text-sm font-bold text-primary">
                      {gameState.devOpsMetrics.mttr}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">Success Rate</span>
                    <span className="text-sm font-bold text-primary">
                      {gameState.devOpsMetrics.changeFailureRate}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Facilitator Controls */}
              <Card className="bg-gradient-primary/10 border-primary/20">
                <CardHeader>
                  <CardTitle className="text-lg font-medium flex items-center gap-2">
                    <Crown className="w-5 h-5 text-primary" />
                    Facilitator Controls
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {gameState.currentPhase === 'start_turn' && (
                    <Button 
                      onClick={handleStartVoting}
                      className="w-full bg-gradient-primary text-white hover:opacity-90"
                      size="lg"
                    >
                      Start Team Voting - Turn {gameState.turnNumber}
                    </Button>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Main Content */}
          <div className={`${isHost ? 'lg:col-span-3' : 'lg:col-span-4'} space-y-6`}>
            {renderPhaseContent()}

            {/* Team Roster */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Team Roster
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {teamMembers.map((player, index) => (
                    <div key={player.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline">#{index + 1}</Badge>
                        <span className="font-medium">{player.name}</span>
                      </div>
                      <Badge variant="secondary">{player.role}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Game End Dialog */}
      <AlertDialog open={showGameEndDialog} onOpenChange={setShowGameEndDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Game Ended</AlertDialogTitle>
            <AlertDialogDescription>
              The game has been ended by the facilitator.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button onClick={() => {
              setShowGameEndDialog(false);
              onEndGame();
            }}>
              Return to Setup
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};