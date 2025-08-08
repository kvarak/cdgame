import { GameEvent, GameStateEngine } from './GameStateEngine';
import { toast } from '@/hooks/use-toast';

export class EventManager {
  private gameEngine: GameStateEngine;
  private availableEvents: GameEvent[] = [];

  constructor(gameEngine: GameStateEngine) {
    this.gameEngine = gameEngine;
  }

  async loadEvents(): Promise<void> {
    try {
      const response = await fetch('/events.ndjson');
      const text = await response.text();
      const events = text
        .trim()
        .split('\n')
        .map(line => JSON.parse(line));
      
      this.availableEvents = events;
      console.log('Loaded events:', events.length);
    } catch (error) {
      console.error('Failed to load events:', error);
    }
  }

  triggerRandomEvent(): GameEvent | null {
    if (this.availableEvents.length === 0) return null;

    const randomEvent = this.availableEvents[
      Math.floor(Math.random() * this.availableEvents.length)
    ];

    this.gameEngine.updateState({ currentEvent: randomEvent });
    return randomEvent;
  }

  acknowledgeEvent(): void {
    const state = this.gameEngine.getState();
    const currentEvent = state.currentEvent;

    if (currentEvent) {
      this.applyEventEffects(currentEvent);
      
      toast({
        title: "Event Applied",
        description: currentEvent.description,
        variant: currentEvent.effect.includes('reduce') ? 'destructive' : 'default'
      });
    }

    this.gameEngine.updateState({ currentEvent: null });
  }

  private applyEventEffects(event: GameEvent): void {
    const state = this.gameEngine.getState();
    let businessUpdates = {};
    let devOpsUpdates = {};

    // Parse effect string and apply changes
    // This is a simplified version - you could expand this based on your event format
    const effectValue = this.parseEffectValue(event.effect);
    
    switch (event.severity) {
      case 'critical':
        businessUpdates = {
          securityScore: Math.max(0, state.businessMetrics.securityScore - 15),
          reputation: Math.max(0, state.businessMetrics.reputation - 10)
        };
        devOpsUpdates = {
          mttr: Math.max(0, state.devOpsMetrics.mttr - 10)
        };
        break;
      case 'high':
        businessUpdates = {
          performanceScore: Math.max(0, state.businessMetrics.performanceScore - 10)
        };
        break;
      case 'medium':
        businessUpdates = {
          businessIncome: Math.max(0, state.businessMetrics.businessIncome - 5)
        };
        break;
      case 'low':
        // Minor positive effect
        businessUpdates = {
          reputation: Math.min(100, state.businessMetrics.reputation + 2)
        };
        break;
    }

    this.gameEngine.updateMetrics(businessUpdates, devOpsUpdates);
  }

  private parseEffectValue(effect: string): number {
    // Extract numeric value from effect string
    const match = effect.match(/-?\d+/);
    return match ? parseInt(match[0], 10) : 0;
  }
}