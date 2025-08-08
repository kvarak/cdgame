import { GamePhase, GameStateEngine } from './GameStateEngine';
import { TaskManager } from './TaskManager';
import { EventManager } from './EventManager';

export class PhaseManager {
  private gameEngine: GameStateEngine;
  private taskManager: TaskManager;
  private eventManager: EventManager;

  constructor(gameEngine: GameStateEngine, taskManager: TaskManager, eventManager: EventManager) {
    this.gameEngine = gameEngine;
    this.taskManager = taskManager;
    this.eventManager = eventManager;
  }

  async startVoting(): Promise<void> {
    const state = this.gameEngine.getState();
    
    // Select tasks for this turn
    const tasks = this.taskManager.selectTasksForVoting(state.turnNumber);
    
    // Update state
    this.gameEngine.updateState({
      currentPhase: 'voting',
      currentTasks: tasks,
      playerVotes: {}
    });

    console.log('Starting voting phase with tasks:', tasks);

    // Sync to database if host
    if (state.isHost) {
      await this.gameEngine.syncToDatabase();
    }
  }

  async completeVoting(votes: Record<string, string>): Promise<void> {
    const { selected, unselected } = this.taskManager.processVotingResults(votes);
    
    this.gameEngine.updateState({
      currentPhase: 'events',
      selectedTasks: selected,
      unselectedTasks: unselected
    });

    console.log('Voting completed:', { selected, unselected });

    // Sync to database if host
    const state = this.gameEngine.getState();
    if (state.isHost) {
      await this.gameEngine.syncToDatabase();
      // Start events phase
      this.startEvents();
    }
  }

  startEvents(): void {
    const event = this.eventManager.triggerRandomEvent();
    
    if (!event) {
      // Skip events if none available, go to execution
      this.startExecution();
      return;
    }

    console.log('Event triggered:', event);
  }

  completeEvents(): void {
    this.eventManager.acknowledgeEvent();
    this.startExecution();
  }

  private startExecution(): void {
    const state = this.gameEngine.getState();
    
    // Apply consequences for unselected tasks
    this.taskManager.applyTaskConsequences(state.unselectedTasks);
    
    this.gameEngine.updateState({ currentPhase: 'execution' });

    // Sync to database if host
    if (state.isHost) {
      this.gameEngine.syncToDatabase();
    }
  }

  endTurn(): void {
    const state = this.gameEngine.getState();
    
    this.gameEngine.updateState({
      currentPhase: 'start_turn',
      turnNumber: state.turnNumber + 1,
      currentTasks: [],
      selectedTasks: [],
      unselectedTasks: [],
      playerVotes: {}
    });

    // Sync to database if host
    if (state.isHost) {
      this.gameEngine.syncToDatabase();
    }
  }

  canAdvancePhase(targetPhase: GamePhase): boolean {
    const state = this.gameEngine.getState();
    
    switch (targetPhase) {
      case 'voting':
        return state.currentPhase === 'start_turn';
      case 'events':
        return state.currentPhase === 'voting' && this.hasAllVotes();
      case 'execution':
        return state.currentPhase === 'events';
      case 'end_turn':
        return state.currentPhase === 'execution';
      case 'start_turn':
        return state.currentPhase === 'end_turn';
      default:
        return false;
    }
  }

  private hasAllVotes(): boolean {
    const state = this.gameEngine.getState();
    const teamMembers = state.players.filter(player => player.role);
    const votesReceived = Object.keys(state.playerVotes).length;
    
    return votesReceived === teamMembers.length && votesReceived > 0;
  }
}