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

    return [...incompleteTasks, ...newRandomTasks];
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
    const totalPlayers = players.length;
    
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
      
      const progressGain = (effectiveVotes / totalPlayers) * 100;
      const currentProgress = task.progress || 0;
      const newProgress = Math.min(100, currentProgress + progressGain);
      
      return { ...task, progress: newProgress };
    });

    // Split into completed and in-progress tasks
    const completedTasks = updatedTasks.filter(task => (task.progress || 0) >= 100);
    const inProgressTasks = updatedTasks.filter(task => (task.progress || 0) < 100 && (voteCount[task.id] || 0) > 0);
    const untouchedTasks = updatedTasks.filter(task => !(voteCount[task.id] || 0));

    return {
      selected: completedTasks,
      unselected: [...inProgressTasks, ...untouchedTasks]
    };
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
      'Developer': ['deployment', 'performance'],
      'DevOps Engineer': ['deployment', 'monitoring'],
      'Site Reliability Engineer': ['monitoring', 'performance'],
      'Security Engineer': ['security'],
      'QA Engineer': ['testing']
    };

    return roleRecommendations[playerRole]?.includes(task.type) || false;
  }
}