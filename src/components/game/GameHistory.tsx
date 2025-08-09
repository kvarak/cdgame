import { useState, useEffect } from 'react';
import { ArrowLeft, Calendar, Clock, Trophy, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface GameHistoryEntry {
  id: string;
  final_score: number;
  turns_completed: number;
  pipeline_stage_reached: number;
  game_duration_minutes: number | null;
  completed_at: string;
  final_business_metrics?: {
    businessIncome: number;
    securityScore: number;
    performanceScore: number;
    reputation: number;
    technicalDebt: number;
  };
  final_devops_metrics?: {
    deploymentFrequency: number;
    leadTime: number;
    mttr: number;
    changeFailureRate: number;
  };
}

interface GameHistoryProps {
  onBack: () => void;
}

export const GameHistory = ({ onBack }: GameHistoryProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [history, setHistory] = useState<GameHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchGameHistory();
    }
  }, [user]);

  const fetchGameHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('game_history')
        .select('*')
        .order('completed_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setHistory(data || []);
    } catch (error) {
      console.error('Error fetching game history:', error);
      toast({
        title: "Error",
        description: "Failed to load game history. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'bg-green-100 text-green-800 border-green-200';
    if (score >= 60) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-red-100 text-red-800 border-red-200';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-4 mb-8">
            <Button onClick={onBack} variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <h1 className="text-3xl font-bold">Game History</h1>
          </div>
          <div className="text-center py-8">Loading game history...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Button onClick={onBack} variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-3xl font-bold">Game History</h1>
          <Badge variant="secondary">{history.length} games played</Badge>
        </div>

        {history.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No games played yet</h3>
              <p className="text-muted-foreground">
                Complete some games to see your history here!
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {history.map((game) => (
              <Card key={game.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">
                      DevOps Pipeline Game
                    </CardTitle>
                    <Badge className={getScoreColor(game.final_score)}>
                      <Trophy className="h-3 w-3 mr-1" />
                      {game.final_score} points
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>{formatDate(game.completed_at)}</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-muted-foreground" />
                      <span>Stage {game.pipeline_stage_reached}/5</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>{game.turns_completed} turns</span>
                    </div>
                    
                    {game.game_duration_minutes && (
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span>{game.game_duration_minutes} min</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};