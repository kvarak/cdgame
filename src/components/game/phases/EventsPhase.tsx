import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import { GameState } from "@/lib/gameEngine/GameStateEngine";

interface EventsPhaseProps {
  gameState: GameState;
  onAcknowledgeEvent: () => void;
}

export const EventsPhase = ({ gameState, onAcknowledgeEvent }: EventsPhaseProps) => {
  const { currentEvent, isHost } = gameState;

  if (!currentEvent) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center py-6">
            <p className="text-sm text-muted-foreground">
              No events to process. Moving to execution phase...
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isHost) {
    return (
      <Card className="border-warning bg-warning/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-warning" />
            Random Event: {currentEvent.name}
          </CardTitle>
          <CardDescription>
            An unexpected event has occurred that affects your team
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm mb-4">{currentEvent.description}</p>
          <Button onClick={onAcknowledgeEvent} className="w-full">
            Acknowledge Event
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Team member view
  return (
    <Card>
      <CardContent className="p-6">
        <div className="text-center py-6">
          <div className="w-12 h-12 bg-warning/20 rounded-full flex items-center justify-center mx-auto mb-3">
            <AlertTriangle className="w-6 h-6 text-warning" />
          </div>
          <h3 className="text-base font-semibold mb-2">Processing Events</h3>
          <p className="text-sm text-muted-foreground">
            Handling random events that affect the team
          </p>
          
          {currentEvent && (
            <div className="mt-4 p-3 bg-warning/10 rounded border border-warning/20">
              <h4 className="font-medium text-sm text-warning mb-1">
                {currentEvent.name}
              </h4>
              <p className="text-xs text-muted-foreground">
                {currentEvent.description}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};