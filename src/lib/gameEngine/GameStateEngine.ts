import { supabase } from '@/integrations/supabase/client';

export type GamePhase = 'start_turn' | 'voting' | 'events' | 'execution' | 'end_turn';

export interface Challenge {
  id: string;
  title: string;
  description: string;
  type: 'bug' | 'feature' | 'performance' | 'security' | 'infrastructure' | 'monitoring' | 'quality' | 'compliance';
  difficulty: number;
  progress?: number; // Track completion progress
  progressNeeded?: number; // Calculated based on players + difficulty + tech debt
  consequences?: string[];
  businessImpact?: {
    businessIncome?: number;
    securityScore?: number;
    performanceScore?: number;
    reputation?: number;
    technicalDebt?: number;
  };
  devOpsImpact?: {
    deploymentFrequency?: number;
    leadTime?: number;
    mttr?: number;
    changeFailureRate?: number;
  };
  metricImpacts?: {
    business?: 'minor' | 'some' | 'major';
    devops?: 'minor' | 'some' | 'major';
  };
}

export interface GameEvent {
  id: string;
  name: string;
  description: string;
  effect: string;
  severity: number;
  duration?: number;
  businessImpact?: {
    businessIncome?: number;
    securityScore?: number;
    performanceScore?: number;
    reputation?: number;
    technicalDebt?: number;
  };
  devOpsImpact?: {
    deploymentFrequency?: number;
    leadTime?: number;
    mttr?: number;
    changeFailureRate?: number;
  };
  metricImpacts?: {
    business?: 'minor' | 'some' | 'major';
    devops?: 'minor' | 'some' | 'major';
  };
}

export interface Player {
  id: string;
  name: string;
  role?: string;
  powerUsed?: boolean;
}

export interface BusinessMetrics {
  businessIncome: number;
  securityScore: number;
  performanceScore: number;
  reputation: number;
  technicalDebt: number;
}

export interface DevOpsMetrics {
  deploymentFrequency: number;
  leadTime: number;
  mttr: number;
  changeFailureRate: number;
}

export interface GameState {
  gameSessionId: string;
  gameCode: string;
  currentPhase: GamePhase;
  turnNumber: number;
  gameStartTime: Date;
  
  // Tasks and voting
  currentTasks: Challenge[];
  selectedTasks: Challenge[];
  unselectedTasks: Challenge[];
  pendingTasks: Challenge[];
  inProgressTasks: Challenge[]; // Tasks being worked on
  playerVotes: Record<string, string>;
  activeConsequences: Challenge[]; // Tasks that incur consequences each turn
  
  // Events
  currentEvent: GameEvent | null;
  
  // Metrics
  businessMetrics: BusinessMetrics;
  devOpsMetrics: DevOpsMetrics;
  metricsHistory: Array<{
    turn: number;
    business: BusinessMetrics;
    devops: DevOpsMetrics;
  }>;
  
  // Players
  players: Player[];
  currentPlayerName: string;
  isHost: boolean;
}

export class GameStateEngine {
  private state: GameState;
  private listeners: Set<(state: GameState) => void> = new Set();
  private realtimeChannel: any = null;

  constructor(initialState: Partial<GameState>) {
    this.state = {
      gameSessionId: '',
      gameCode: '',
      currentPhase: 'start_turn',
      turnNumber: 1,
      gameStartTime: new Date(),
      currentTasks: [],
      selectedTasks: [],
      unselectedTasks: [],
      pendingTasks: [],
      inProgressTasks: [],
      playerVotes: {},
      currentEvent: null,
      businessMetrics: {
        businessIncome: 50,
        securityScore: 50,
        performanceScore: 50,
        reputation: 50,
        technicalDebt: 0
      },
      devOpsMetrics: {
        deploymentFrequency: 50,
        leadTime: 50,
        mttr: 50,
        changeFailureRate: 50
      },
      players: [],
      currentPlayerName: '',
      isHost: false,
      activeConsequences: [],
      metricsHistory: [],
      ...initialState
    };
  }

  // State access
  getState(): GameState {
    return { ...this.state };
  }

  // State updates
  updateState(updates: Partial<GameState>): void {
    this.state = { ...this.state, ...updates };
    this.notifyListeners();
  }

  updatePhase(phase: GamePhase): void {
    this.updateState({ currentPhase: phase });
  }

  updateTasks(tasks: Challenge[]): void {
    this.updateState({ currentTasks: tasks });
  }

  updateVotes(votes: Record<string, string>): void {
    this.updateState({ playerVotes: votes });
  }

  updateMetrics(businessMetrics?: Partial<BusinessMetrics>, devOpsMetrics?: Partial<DevOpsMetrics>): void {
    const updates: Partial<GameState> = {};
    
    if (businessMetrics) {
      updates.businessMetrics = { ...this.state.businessMetrics, ...businessMetrics };
    }
    
    if (devOpsMetrics) {
      updates.devOpsMetrics = { ...this.state.devOpsMetrics, ...devOpsMetrics };
    }
    
    this.updateState(updates);
  }

  // Event listeners
  subscribe(listener: (state: GameState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.state));
  }

  // Real-time synchronization
  async initializeRealtime(): Promise<void> {
    if (!this.state.gameSessionId) return;

    // Add heartbeat to keep connection alive
    this.realtimeChannel = supabase
      .channel(`game-session-${this.state.gameSessionId}`, {
        config: { presence: { key: this.state.currentPlayerName } }
      })
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'game_sessions',
          filter: `id=eq.${this.state.gameSessionId}`
        },
        (payload) => {
          console.log('Real-time update received:', payload.new);
          this.handleRealtimeUpdate(payload.new);
        }
      )
      .subscribe();
  }

  private handleRealtimeUpdate(data: any): void {
    if (data.status === 'ended') {
      // Handle game end
      return;
    }

    if (data.current_sprint_state) {
      const state = data.current_sprint_state;
      
      const updates: Partial<GameState> = {};
      
      if (state.phase) updates.currentPhase = state.phase;
      if (state.current_tasks) updates.currentTasks = state.current_tasks;
      if (state.selected_tasks) updates.selectedTasks = state.selected_tasks;
      if (state.unselected_tasks) updates.unselectedTasks = state.unselected_tasks;
      if (state.turn_number) updates.turnNumber = state.turn_number;
      if (state.player_votes) updates.playerVotes = state.player_votes;
      
      this.updateState(updates);
    }
  }

  async syncToDatabase(): Promise<void> {
    if (!this.state.gameSessionId) return;

    try {
      const gameState = {
        phase: this.state.currentPhase,
        current_tasks: JSON.parse(JSON.stringify(this.state.currentTasks)),
        selected_tasks: JSON.parse(JSON.stringify(this.state.selectedTasks)),
        unselected_tasks: JSON.parse(JSON.stringify(this.state.unselectedTasks)),
        turn_number: this.state.turnNumber,
        player_votes: this.state.playerVotes
      };

      const { error } = await supabase
        .from('game_sessions')
        .update({
          current_sprint_state: gameState,
          updated_at: new Date().toISOString()
        })
        .eq('id', this.state.gameSessionId);

      if (error) {
        console.error('Error syncing game state:', error);
      }
    } catch (error) {
      console.error('Error syncing game state:', error);
    }
  }

  cleanup(): void {
    if (this.realtimeChannel) {
      supabase.removeChannel(this.realtimeChannel);
      this.realtimeChannel = null;
    }
    this.listeners.clear();
  }
}