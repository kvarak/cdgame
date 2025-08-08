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
    
    // Start with 3 random tasks for turn 1, increase for later turns
    const tasksToShow = Math.min(3 + (turnNumber - 1), 5);
    const allAvailableTasks = [
      ...state.pendingTasks,
      ...this.availableChallenges.filter(c => 
        !state.pendingTasks.some(p => p.id === c.id)
      )
    ];
    
    const randomTasks = allAvailableTasks
      .sort(() => Math.random() - 0.5)
      .slice(0, tasksToShow);

    return randomTasks;
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
    
    // Count votes for each task
    const voteCount: Record<string, number> = {};
    Object.values(votes).forEach(taskId => {
      voteCount[taskId] = (voteCount[taskId] || 0) + 1;
    });

    // Find the task with the most votes
    let maxVotes = 0;
    let selectedTaskId = '';
    
    Object.entries(voteCount).forEach(([taskId, count]) => {
      if (count > maxVotes) {
        maxVotes = count;
        selectedTaskId = taskId;
      }
    });

    const selectedTask = state.currentTasks.find(task => task.id === selectedTaskId);
    const unselectedTasks = state.currentTasks.filter(task => task.id !== selectedTaskId);

    return {
      selected: selectedTask ? [selectedTask] : [],
      unselected: unselectedTasks
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
      'Developer': ['deployment', 'testing'],
      'DevOps Engineer': ['deployment', 'monitoring'],
      'Site Reliability Engineer': ['monitoring', 'performance'],
      'Security Engineer': ['security'],
      'QA Engineer': ['testing']
    };

    return roleRecommendations[playerRole]?.includes(task.type) || false;
  }
}