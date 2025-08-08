import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Crown, AlertTriangle } from "lucide-react";

interface Challenge {
  id: string;
  title: string;
  description: string;
  type: 'bug' | 'security' | 'performance' | 'feature';
  difficulty: 1 | 2 | 3;
}

interface VotingPopupProps {
  isOpen: boolean;
  challenges: Challenge[];
  onVoteSubmit: (mostImportant: string, leastImportant: string) => void;
  onClose: () => void;
}

const CHALLENGE_COLORS = {
  bug: 'bg-error text-error-foreground',
  security: 'bg-warning text-warning-foreground',
  performance: 'bg-pipeline-monitor text-pipeline-monitor-foreground',
  feature: 'bg-success text-success-foreground'
};

export const VotingPopup = ({ isOpen, challenges, onVoteSubmit, onClose }: VotingPopupProps) => {
  const [mostImportant, setMostImportant] = useState<string>("");
  const [leastImportant, setLeastImportant] = useState<string>("");

  const handleSubmit = () => {
    if (mostImportant && leastImportant && mostImportant !== leastImportant) {
      onVoteSubmit(mostImportant, leastImportant);
      setMostImportant("");
      setLeastImportant("");
      onClose();
    }
  };

  const canSubmit = mostImportant && leastImportant && mostImportant !== leastImportant;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Crown className="w-6 h-6 text-warning" />
            Secret Vote - Sprint Priority
          </DialogTitle>
          <DialogDescription>
            Choose which challenge is most important and which is least important for this sprint.
            Your vote will influence the game outcome.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          <div>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <span className="text-success">👑</span>
              Most Important Challenge
            </h3>
            <div className="space-y-2">
              {challenges.map((challenge) => (
                <Card 
                  key={`most-${challenge.id}`}
                  className={`cursor-pointer border transition-all ${
                    mostImportant === challenge.id 
                      ? 'ring-2 ring-success bg-success/10' 
                      : 'hover:bg-muted/50'
                  }`}
                  onClick={() => setMostImportant(challenge.id)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium">{challenge.title}</h4>
                          <Badge className={CHALLENGE_COLORS[challenge.type]}>
                            {challenge.type}
                          </Badge>
                          <Badge variant="outline">
                            Difficulty: {challenge.difficulty}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {challenge.description}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <span className="text-muted-foreground">⬇️</span>
              Least Important Challenge
            </h3>
            <div className="space-y-2">
              {challenges.map((challenge) => (
                <Card 
                  key={`least-${challenge.id}`}
                  className={`cursor-pointer border transition-all ${
                    leastImportant === challenge.id 
                      ? 'ring-2 ring-muted bg-muted/20' 
                      : 'hover:bg-muted/50'
                  } ${
                    mostImportant === challenge.id ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                  onClick={() => mostImportant !== challenge.id && setLeastImportant(challenge.id)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium">{challenge.title}</h4>
                          <Badge className={CHALLENGE_COLORS[challenge.type]}>
                            {challenge.type}
                          </Badge>
                          <Badge variant="outline">
                            Difficulty: {challenge.difficulty}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {challenge.description}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <AlertTriangle className="w-4 h-4" />
              Your votes are secret and will influence the game
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button 
                onClick={handleSubmit}
                disabled={!canSubmit}
                className="bg-gradient-primary"
              >
                Submit Vote
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};