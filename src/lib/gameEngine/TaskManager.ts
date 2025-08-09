import { Challenge, GameStateEngine } from './GameStateEngine';
import { toast } from '@/hooks/use-toast';

export class TaskManager {
  private gameEngine: GameStateEngine;
  private availableChallenges: Challenge[] = [];

  constructor(gameEngine: GameStateEngine) {
    this.gameEngine = gameEngine;
  }

  async loadChallenges(): Promise<void> {
    try {
      const response = await fetch('/tasks.ndjson');
      const text = await response.text();
      const challenges = text
        .trim()
        .split('\n')
        .map(line => JSON.parse(line));
      
      this.availableChallenges = challenges;
      console.log('Loaded challenges:', challenges.length);
    } catch (error) {
      console.error('Failed to load challenges:', error);
    }
  }

  selectTasksForVoting(turnNumber: number): Challenge[] {
    const state = this.gameEngine.getState();
    
    // Include incomplete tasks from previous turns + new tasks
    const incompleteTasks = state.inProgressTasks || [];
    const newTasksNeeded = Math.min(3 + (turnNumber - 1), 5) - incompleteTasks.length;
    
    const allAvailableTasks = [
      ...state.pendingTasks,
      ...this.availableChallenges.filter(c => 
        !state.pendingTasks.some(p => p.id === c.id) &&
        !incompleteTasks.some(i => i.id === c.id)
      )
    ];
    
    const newRandomTasks = allAvailableTasks
      .sort(() => Math.random() - 0.5)
      .slice(0, Math.max(0, newTasksNeeded));

    // Add "Reduce Technical Debt" option
    const reduceTechDebtTask: Challenge = {
      id: 'reduce_tech_debt',
      title: 'Reduce Technical Debt',
      description: 'Focus on reducing technical debt by refactoring code and improving architecture.',
      type: 'quality',
      difficulty: 1,
      progress: 0,
      metricImpacts: { business: 'minor' }
    };

    const allTasks = [...incompleteTasks, ...newRandomTasks, reduceTechDebtTask];
    
    // Calculate progress needed for each task based on players, difficulty, and tech debt
    return allTasks.map(task => this.calculateProgressNeeded(task));
  }

  private calculateProgressNeeded(task: Challenge): Challenge {
    const state = this.gameEngine.getState();
    const players = state.players.filter(p => p.role).length;
    const difficulty = task.difficulty || 1;
    const techDebt = Math.min(1, state.businessMetrics.technicalDebt / 100); // Convert to 0-1 scale
    
    // Formula: Progress needed = X + DTX (where X = players, D = difficulty, T = tech debt)
    const progressNeeded = Math.ceil(players + (difficulty * techDebt * players));
    
    return {
      ...task,
      progressNeeded
    };
  }

  async submitVote(playerName: string, taskId: string): Promise<void> {
    const state = this.gameEngine.getState();
    const newVotes = { ...state.playerVotes, [playerName]: taskId };
    
    console.log('Submitting vote:', { playerName, taskId, newVotes, currentVotes: state.playerVotes });
    
    this.gameEngine.updateVotes(newVotes);
    
    toast({
      title: "Vote Submitted",
      description: "Your vote has been recorded!",
    });

    // Always sync to database - both host and non-host players need to update votes
    await this.gameEngine.syncToDatabase();
  }

  processVotingResults(votes: Record<string, string>): { selected: Challenge[], unselected: Challenge[] } {
    const state = this.gameEngine.getState();
    const players = state.players.filter(p => p.role); // Only count players with roles
    
    // Count votes for each task and calculate progress
    const voteCount: Record<string, number> = {};
    const roleVotes: Record<string, string[]> = {}; // Track which roles voted for each task
    
    Object.entries(votes).forEach(([playerName, taskId]) => {
      const player = players.find(p => p.name === playerName);
      if (player) {
        voteCount[taskId] = (voteCount[taskId] || 0) + 1;
        if (!roleVotes[taskId]) roleVotes[taskId] = [];
        roleVotes[taskId].push(player.role || '');
      }
    });

    // Calculate progress for each voted task
    const updatedTasks = state.currentTasks.map(task => {
      const votes = voteCount[task.id] || 0;
      const rolesVoted = roleVotes[task.id] || [];
      
      // Check if any voting roles have strengths matching this task
      let effectiveVotes = votes;
      rolesVoted.forEach(role => {
        if (this.isTaskRecommended(task, role)) {
          effectiveVotes += 1; // Double count (already counted once, add one more)
        }
      });
      
      // Handle "Reduce Technical Debt" task
      if (task.id === 'reduce_tech_debt' && votes > 0) {
        this.reduceTechnicalDebt(effectiveVotes);
        return { ...task, progress: 100 }; // Always complete tech debt reduction
      }
      
      const progressGain = effectiveVotes;
      const currentProgress = task.progress || 0;
      const newProgress = currentProgress + progressGain;
      const progressNeeded = task.progressNeeded || players.length;
      
      return { ...task, progress: newProgress };
    });

    // Split into completed and in-progress tasks
    const completedTasks = updatedTasks.filter(task => 
      (task.progress || 0) >= (task.progressNeeded || players.length)
    );
    const inProgressTasks = updatedTasks.filter(task => 
      (task.progress || 0) < (task.progressNeeded || players.length) && 
      (voteCount[task.id] || 0) > 0 && 
      task.id !== 'reduce_tech_debt'
    );
    const untouchedTasks = updatedTasks.filter(task => 
      !(voteCount[task.id] || 0) && task.id !== 'reduce_tech_debt'
    );

    return {
      selected: completedTasks,
      unselected: [...inProgressTasks, ...untouchedTasks]
    };
  }

  private reduceTechnicalDebt(votes: number): void {
    const state = this.gameEngine.getState();
    const reduction = Math.min(votes * 2, 10); // Each vote reduces tech debt by 2, max 10
    const newTechDebt = Math.max(0, state.businessMetrics.technicalDebt - reduction);
    
    this.gameEngine.updateMetrics({ technicalDebt: newTechDebt });
    
    toast({
      title: "Technical Debt Reduced",
      description: `Technical debt reduced by ${reduction} points!`,
    });
  }

  applyTaskConsequences(unselectedTasks: Challenge[]): void {
    const state = this.gameEngine.getState();
    let businessUpdates = {};
    let devOpsUpdates = {};

    unselectedTasks.forEach(task => {
      // Apply business impact
      if (task.businessImpact) {
        Object.entries(task.businessImpact).forEach(([metric, impact]) => {
          if (typeof impact === 'number') {
            const currentValue = state.businessMetrics[metric as keyof typeof state.businessMetrics] as number;
            businessUpdates = {
              ...businessUpdates,
              [metric]: Math.max(0, Math.min(100, currentValue + impact))
            };
          }
        });
      }

      // Apply DevOps impact
      if (task.devOpsImpact) {
        Object.entries(task.devOpsImpact).forEach(([metric, impact]) => {
          if (typeof impact === 'number') {
            const currentValue = state.devOpsMetrics[metric as keyof typeof state.devOpsMetrics] as number;
            devOpsUpdates = {
              ...devOpsUpdates,
              [metric]: Math.max(0, Math.min(100, currentValue + impact))
            };
          }
        });
      }

      // Add to pending tasks for future turns
      if (task.consequences && task.consequences.length > 0) {
        const pendingTasks = [...state.pendingTasks];
        task.consequences.forEach(consequenceId => {
          const consequenceTask = this.availableChallenges.find(c => c.id === consequenceId);
          if (consequenceTask && !pendingTasks.some(p => p.id === consequenceId)) {
            pendingTasks.push(consequenceTask);
          }
        });
        this.gameEngine.updateState({ pendingTasks });
      }
    });

    this.gameEngine.updateMetrics(businessUpdates, devOpsUpdates);
  }

  completeTask(taskId: string): void {
    const state = this.gameEngine.getState();
    const task = state.selectedTasks.find(t => t.id === taskId);
    
    if (!task) return;

    // Apply positive business impact
    let businessUpdates = {};
    let devOpsUpdates = {};

    if (task.businessImpact) {
      Object.entries(task.businessImpact).forEach(([metric, impact]) => {
        if (typeof impact === 'number') {
          const currentValue = state.businessMetrics[metric as keyof typeof state.businessMetrics] as number;
          businessUpdates = {
            ...businessUpdates,
            [metric]: Math.max(0, Math.min(100, currentValue + Math.abs(impact)))
          };
        }
      });
    }

    if (task.devOpsImpact) {
      Object.entries(task.devOpsImpact).forEach(([metric, impact]) => {
        if (typeof impact === 'number') {
          const currentValue = state.devOpsMetrics[metric as keyof typeof state.devOpsMetrics] as number;
          devOpsUpdates = {
            ...devOpsUpdates,
            [metric]: Math.max(0, Math.min(100, currentValue + Math.abs(impact)))
          };
        }
      });
    }

    this.gameEngine.updateMetrics(businessUpdates, devOpsUpdates);

    // Remove from selected tasks
    const updatedSelected = state.selectedTasks.filter(t => t.id !== taskId);
    this.gameEngine.updateState({ selectedTasks: updatedSelected });

    toast({
      title: "Task Completed",
      description: `${task.title} has been completed successfully!`,
    });
  }

  isTaskRecommended(task: Challenge, playerRole?: string): boolean {
    if (!playerRole) return false;

    const roleRecommendations: Record<string, string[]> = {
      'Developer': ['bug', 'feature', 'performance'],
      'DevOps Engineer': ['infrastructure', 'monitoring'],
      'Site Reliability Engineer': ['monitoring', 'performance'],
      'Security Engineer': ['security'],
      'QA Engineer': ['quality', 'bug'],
      'Product Owner': ['feature', 'compliance']
    };

    return roleRecommendations[playerRole]?.includes(task.type) || false;
  }

  // New method to handle end-of-turn consequences
  applyEndOfTurnEffects(): void {
    const state = this.gameEngine.getState();
    
    // Increase technical debt slightly each turn
    const techDebtIncrease = Math.min(2 + (state.turnNumber * 0.5), 5);
    let businessUpdates = {
      technicalDebt: Math.min(100, state.businessMetrics.technicalDebt + techDebtIncrease)
    };

    // Apply consequences for incomplete tasks
    const incompleteConsequences = [...state.inProgressTasks, ...state.activeConsequences];
    
    incompleteConsequences.forEach(task => {
      const impact = this.getTaskConsequenceImpact(task);
      Object.entries(impact).forEach(([metric, value]) => {
        if (typeof value === 'number') {
          const currentValue = state.businessMetrics[metric as keyof typeof state.businessMetrics] as number;
          businessUpdates = {
            ...businessUpdates,
            [metric]: Math.max(0, Math.min(100, currentValue + value))
          };
        }
      });
    });

    this.gameEngine.updateMetrics(businessUpdates);
    
    // Update active consequences (remove descoped features)
    const updatedConsequences = incompleteConsequences.filter(task => {
      if (task.type === 'feature' && Math.random() < 0.25) {
        toast({
          title: "Feature Descoped",
          description: `${task.title} has been removed from the backlog due to delays.`,
          variant: "destructive"
        });
        return false;
      }
      return true;
    });

    this.gameEngine.updateState({ activeConsequences: updatedConsequences });
  }

  private getTaskConsequenceImpact(task: Challenge): Record<string, number> {
    switch (task.type) {
      case 'bug':
        return { [this.getRandomBusinessMetric()]: -2 };
      case 'feature':
        return {}; // Features don't reduce metrics, they get descoped
      case 'performance':
        return { performanceScore: -3 };
      case 'security':
        if (Math.random() < 0.1) { // 10% chance of exploitation
          return { securityScore: -15, reputation: -10 };
        }
        return {};
      default:
        return {};
    }
  }

  private getRandomBusinessMetric(): string {
    const metrics = ['businessIncome', 'reputation', 'performanceScore'];
    return metrics[Math.floor(Math.random() * metrics.length)];
  }
}