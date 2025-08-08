import { useState, useEffect } from "react";

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

type GamePhase = 'start_turn' | 'voting' | 'events' | 'execution' | 'end_turn';

export const useGameState = () => {
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

  // Voting state
  const [playerVotes, setPlayerVotes] = useState<{[playerName: string]: string}>({});

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

  return {
    // State
    currentPhase,
    turnNumber,
    gameStartTime,
    availableChallenges,
    currentTasks,
    selectedTasks,
    unselectedTasks,
    completedTasks,
    pendingTasks,
    availableEvents,
    currentEvent,
    activeConsequences,
    playerVotes,
    businessMetrics,
    devOpsMetrics,
    
    // Setters
    setCurrentPhase,
    setTurnNumber,
    setAvailableChallenges,
    setCurrentTasks,
    setSelectedTasks,
    setUnselectedTasks,
    setCompletedTasks,
    setPendingTasks,
    setAvailableEvents,
    setCurrentEvent,
    setActiveConsequences,
    setPlayerVotes,
    setBusinessMetrics,
    setDevOpsMetrics
  };
};