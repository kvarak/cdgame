import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Clock, Bug, Shield, Zap } from "lucide-react";
import { Challenge } from "@/lib/gameEngine/GameStateEngine";

const CHALLENGE_COLORS: Record<string, string> = {
  bug: "bg-red-100 text-red-800 border-red-300",
  security: "bg-orange-100 text-orange-800 border-orange-300",
  performance: "bg-yellow-100 text-yellow-800 border-yellow-300",
  feature: "bg-blue-100 text-blue-800 border-blue-300",
  infrastructure: "bg-purple-100 text-purple-800 border-purple-300",
  monitoring: "bg-green-100 text-green-800 border-green-300",
  quality: "bg-gray-100 text-gray-800 border-gray-300",
  compliance: "bg-indigo-100 text-indigo-800 border-indigo-300"
};

const CHALLENGE_ICONS: Record<string, any> = {
  bug: Bug,
  security: Shield,
  performance: Zap,
  feature: Clock,
  infrastructure: Clock,
  monitoring: Clock,
  quality: Clock,
  compliance: Clock
};

interface ActiveConsequencesProps {
  activeConsequences: Challenge[];
}

export const ActiveConsequences = ({ activeConsequences }: ActiveConsequencesProps) => {
  if (activeConsequences.length === 0) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-green-800 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Active Consequences
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-green-600">
            No active consequences - great job keeping up with tasks!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-warning/30 bg-warning/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-warning flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          Active Consequences
          <Badge variant="outline" className="bg-warning/20">
            {activeConsequences.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {activeConsequences.map((task) => {
            const Icon = CHALLENGE_ICONS[task.type] || Clock;
            return (
              <div
                key={task.id}
                className="flex items-center gap-2 p-2 bg-background rounded border border-border/50"
              >
                <Icon className="w-3 h-3 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-medium truncate">{task.title}</h4>
                  <p className="text-xs text-muted-foreground">
                    Causing ongoing impact each turn
                  </p>
                </div>
                <Badge className={CHALLENGE_COLORS[task.type]} variant="outline">
                  {task.type}
                </Badge>
              </div>
            );
          })}
        </div>
        <div className="mt-3 pt-2 border-t border-border/50">
          <p className="text-xs text-muted-foreground">
            These tasks are reducing metrics each turn until completed.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};