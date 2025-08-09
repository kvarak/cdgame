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

    // Apply event impacts
    if (event.businessImpact) {
      Object.entries(event.businessImpact).forEach(([metric, impact]) => {
        if (typeof impact === 'number') {
          const currentValue = state.businessMetrics[metric as keyof typeof state.businessMetrics] as number;
          businessUpdates = {
            ...businessUpdates,
            [metric]: Math.max(0, Math.min(100, currentValue + impact))
          };
        }
      });
    }

    if (event.devOpsImpact) {
      Object.entries(event.devOpsImpact).forEach(([metric, impact]) => {
        if (typeof impact === 'number') {
          const currentValue = state.devOpsMetrics[metric as keyof typeof state.devOpsMetrics] as number;
          devOpsUpdates = {
            ...devOpsUpdates,
            [metric]: Math.max(0, Math.min(100, currentValue + impact))
          };
        }
      });
    }

    // Apply severity-based effects if no specific impacts defined
    if (!event.businessImpact && !event.devOpsImpact) {
      const severityImpact = Math.min(event.severity, 30);
      
      if (event.effect.includes('reduce')) {
        businessUpdates = {
          businessIncome: Math.max(0, state.businessMetrics.businessIncome - severityImpact)
        };
      } else if (event.effect.includes('increase')) {
        businessUpdates = {
          businessIncome: Math.min(100, state.businessMetrics.businessIncome + severityImpact)
        };
      }
    }

    this.gameEngine.updateMetrics(businessUpdates, devOpsUpdates);
  }

  private parseEffectValue(effect: string): number {
    // Extract numeric value from effect string
    const match = effect.match(/-?\d+/);
    return match ? parseInt(match[0], 10) : 0;
  }
}