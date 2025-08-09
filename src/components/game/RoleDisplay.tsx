import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Player } from "@/lib/gameEngine/GameStateEngine";
import { RolePowerManager } from "@/lib/gameEngine/RolePowerManager";
import { User, Star, Zap } from "lucide-react";

interface RoleDisplayProps {
  player: Player;
  rolePowerManager: RolePowerManager;
  onUsePower?: (powerType: string) => void;
  isCurrentPlayer?: boolean;
}

const ROLE_DESCRIPTIONS: Record<string, { description: string; strengths: string[] }> = {
  'Developer': {
    description: 'The code architect who builds the foundation and ensures systems work together seamlessly.',
    strengths: ['bugs', 'features', 'performance tasks']
  },
  'QA Engineer': {
    description: 'The quality guardian who catches bugs before they reach production and ensures reliability.',
    strengths: ['quality improvements', 'bug fixes']
  },
  'DevOps Engineer': {
    description: 'The bridge between development and operations, keeping the deployment pipeline smooth.',
    strengths: ['infrastructure', 'monitoring tasks']
  },
  'Product Owner': {
    description: 'The voice of the customer who ensures the team builds the right thing at the right time.',
    strengths: ['features', 'compliance tasks']
  },
  'Security Engineer': {
    description: 'The cyber guardian who protects against threats and ensures regulatory compliance.',
    strengths: ['security vulnerabilities']
  },
  'Site Reliability Engineer': {
    description: 'The stability expert who keeps systems running when everything tries to break.',
    strengths: ['monitoring', 'performance tasks']
  }
};

export const RoleDisplay = ({ player, rolePowerManager, onUsePower, isCurrentPlayer }: RoleDisplayProps) => {
  if (!player.role) {
    return (
      <Card className="border-border/50">
        <CardContent className="p-4 text-center">
          <User className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No role assigned</p>
        </CardContent>
      </Card>
    );
  }

  const roleInfo = ROLE_DESCRIPTIONS[player.role];
  const power = rolePowerManager.getRolePowers(player);

  return (
    <Card className={`border-2 ${isCurrentPlayer ? 'border-primary bg-primary/5' : 'border-border/50'}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <User className="w-4 h-4" />
            {player.name}
          </CardTitle>
          <Badge variant="secondary">{player.role}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {roleInfo && (
          <>
            <div>
              <p className="text-sm text-muted-foreground mb-2">
                {roleInfo.description}
              </p>
              <div className="flex items-center gap-1 text-xs">
                <Star className="w-3 h-3 text-primary" />
                <span className="font-medium">Strengths:</span>
                <span className="text-muted-foreground">
                  {roleInfo.strengths.join(', ')}
                </span>
              </div>
            </div>

            {power && (
              <div className="pt-2 border-t border-border/50">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1">
                    <Zap className="w-3 h-3 text-warning" />
                    <span className="text-xs font-medium">Special Power:</span>
                  </div>
                  <Badge variant={player.powerUsed ? "secondary" : "outline"} className="text-xs">
                    {player.powerUsed ? "Used" : "Available"}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground mb-2">
                  <strong>{power.name}:</strong> {power.description}
                </div>
                {isCurrentPlayer && !player.powerUsed && onUsePower && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full text-xs"
                    onClick={() => onUsePower(power.name)}
                  >
                    <Zap className="w-3 h-3 mr-1" />
                    Use {power.name}
                  </Button>
                )}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};