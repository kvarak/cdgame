import { GameStateEngine, Player, Challenge } from './GameStateEngine';
import { toast } from '@/hooks/use-toast';

export interface RolePower {
  name: string;
  description: string;
  action: () => void;
}

export class RolePowerManager {
  private gameEngine: GameStateEngine;

  constructor(gameEngine: GameStateEngine) {
    this.gameEngine = gameEngine;
  }

  getRolePowers(player: Player): RolePower | null {
    if (!player.role || player.powerUsed) return null;

    const powers: Record<string, RolePower> = {
      'Developer': {
        name: 'Epiphany',
        description: 'Close a bug by yourself instantly',
        action: () => this.developerEpiphany()
      },
      'QA Engineer': {
        name: 'Instant Validation',
        description: 'Instantly validate a feature, skipping its remaining progress',
        action: () => this.qaInstantValidation()
      },
      'DevOps Engineer': {
        name: 'Emergency Deploy',
        description: 'Deploy a task immediately, regardless of progress',
        action: () => this.devopsEmergencyDeploy()
      },
      'Product Owner': {
        name: 'Reprioritize',
        description: 'Remove any task from the board',
        action: () => this.productOwnerReprioritize()
      },
      'Security Engineer': {
        name: 'Security Patch',
        description: 'Patch a vulnerability, preventing security exploits for two turns',
        action: () => this.securityPatch()
      },
      'Site Reliability Engineer': {
        name: 'Incident Response',
        description: 'Restore a major metric to its previous value',
        action: () => this.sreIncidentResponse()
      }
    };

    return powers[player.role] || null;
  }

  usePower(playerName: string, powerType: string): boolean {
    const state = this.gameEngine.getState();
    const player = state.players.find(p => p.name === playerName);
    
    if (!player || !player.role || player.powerUsed) {
      return false;
    }

    const power = this.getRolePowers(player);
    if (!power) return false;

    // Execute the power
    power.action();

    // Mark power as used
    const updatedPlayers = state.players.map(p => 
      p.name === playerName ? { ...p, powerUsed: true } : p
    );
    
    this.gameEngine.updateState({ players: updatedPlayers });

    toast({
      title: `${power.name} Used!`,
      description: power.description,
      variant: "default"
    });

    return true;
  }

  private developerEpiphany(): void {
    const state = this.gameEngine.getState();
    const bugTasks = [...state.currentTasks, ...state.inProgressTasks].filter(task => task.type === 'bug');
    
    if (bugTasks.length > 0) {
      const randomBug = bugTasks[Math.floor(Math.random() * bugTasks.length)];
      
      // Complete the bug instantly
      const updatedInProgress = state.inProgressTasks.filter(t => t.id !== randomBug.id);
      const updatedCurrent = state.currentTasks.filter(t => t.id !== randomBug.id);
      const updatedSelected = [...state.selectedTasks, { ...randomBug, progress: randomBug.progressNeeded || 100 }];
      
      this.gameEngine.updateState({
        inProgressTasks: updatedInProgress,
        currentTasks: updatedCurrent,
        selectedTasks: updatedSelected
      });
    }
  }

  private qaInstantValidation(): void {
    const state = this.gameEngine.getState();
    const featureTasks = [...state.currentTasks, ...state.inProgressTasks].filter(task => task.type === 'feature');
    
    if (featureTasks.length > 0) {
      const randomFeature = featureTasks[Math.floor(Math.random() * featureTasks.length)];
      
      // Complete the feature instantly
      const updatedInProgress = state.inProgressTasks.filter(t => t.id !== randomFeature.id);
      const updatedCurrent = state.currentTasks.filter(t => t.id !== randomFeature.id);
      const updatedSelected = [...state.selectedTasks, { ...randomFeature, progress: randomFeature.progressNeeded || 100 }];
      
      this.gameEngine.updateState({
        inProgressTasks: updatedInProgress,
        currentTasks: updatedCurrent,
        selectedTasks: updatedSelected
      });
    }
  }

  private devopsEmergencyDeploy(): void {
    const state = this.gameEngine.getState();
    const infrastructureTasks = [...state.currentTasks, ...state.inProgressTasks]
      .filter(task => task.type === 'infrastructure' || task.type === 'monitoring');
    
    if (infrastructureTasks.length > 0) {
      const randomTask = infrastructureTasks[Math.floor(Math.random() * infrastructureTasks.length)];
      
      // Complete the task instantly
      const updatedInProgress = state.inProgressTasks.filter(t => t.id !== randomTask.id);
      const updatedCurrent = state.currentTasks.filter(t => t.id !== randomTask.id);
      const updatedSelected = [...state.selectedTasks, { ...randomTask, progress: randomTask.progressNeeded || 100 }];
      
      this.gameEngine.updateState({
        inProgressTasks: updatedInProgress,
        currentTasks: updatedCurrent,
        selectedTasks: updatedSelected
      });
    }
  }

  private productOwnerReprioritize(): void {
    const state = this.gameEngine.getState();
    const allTasks = [...state.currentTasks, ...state.inProgressTasks];
    
    if (allTasks.length > 0) {
      const randomTask = allTasks[Math.floor(Math.random() * allTasks.length)];
      
      // Remove the task from both lists
      const updatedInProgress = state.inProgressTasks.filter(t => t.id !== randomTask.id);
      const updatedCurrent = state.currentTasks.filter(t => t.id !== randomTask.id);
      
      this.gameEngine.updateState({
        inProgressTasks: updatedInProgress,
        currentTasks: updatedCurrent
      });
    }
  }

  private securityPatch(): void {
    const state = this.gameEngine.getState();
    
    // Complete any security tasks and provide protection
    const securityTasks = [...state.currentTasks, ...state.inProgressTasks].filter(task => task.type === 'security');
    
    if (securityTasks.length > 0) {
      const randomSecurityTask = securityTasks[Math.floor(Math.random() * securityTasks.length)];
      
      // Complete the security task instantly
      const updatedInProgress = state.inProgressTasks.filter(t => t.id !== randomSecurityTask.id);
      const updatedCurrent = state.currentTasks.filter(t => t.id !== randomSecurityTask.id);
      const updatedSelected = [...state.selectedTasks, { ...randomSecurityTask, progress: randomSecurityTask.progressNeeded || 100 }];
      
      this.gameEngine.updateState({
        inProgressTasks: updatedInProgress,
        currentTasks: updatedCurrent,
        selectedTasks: updatedSelected
      });
    }

    // Boost security metrics
    this.gameEngine.updateMetrics({ securityScore: Math.min(100, state.businessMetrics.securityScore + 15) });
  }

  private sreIncidentResponse(): void {
    const state = this.gameEngine.getState();
    const history = state.metricsHistory;
    
    if (history.length > 0) {
      const previousMetrics = history[history.length - 1];
      
      // Find the metric with the biggest drop and restore it
      const currentBusiness = state.businessMetrics;
      const previousBusiness = previousMetrics.business;
      
      let biggestDrop = 0;
      let metricToRestore = '';
      
      Object.keys(currentBusiness).forEach(metric => {
        const current = currentBusiness[metric as keyof typeof currentBusiness] as number;
        const previous = previousBusiness[metric as keyof typeof previousBusiness] as number;
        const drop = previous - current;
        
        if (drop > biggestDrop) {
          biggestDrop = drop;
          metricToRestore = metric;
        }
      });
      
      if (metricToRestore && biggestDrop > 5) {
        const restoredValue = previousBusiness[metricToRestore as keyof typeof previousBusiness] as number;
        this.gameEngine.updateMetrics({ [metricToRestore]: restoredValue });
      }
    }
  }
}