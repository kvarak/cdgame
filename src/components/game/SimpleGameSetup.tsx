import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Users, Play, GamepadIcon } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import heroImage from "@/assets/devops-hero.jpg";
import { useAuth } from "@/hooks/useAuth";
import { AuthButton } from "@/components/auth/AuthButton";
import { GameHistory } from "./GameHistory";

interface Player {
  id: string;
  name: string;
  role: 'Developer' | 'QA Engineer' | 'DevOps Engineer' | 'Product Owner' | 'Security Engineer' | 'Site Reliability Engineer' | 'Random';
}

const AVAILABLE_ROLES = [
  'Random',
  'Developer',
  'QA Engineer', 
  'DevOps Engineer',
  'Product Owner',
  'Security Engineer',
  'Site Reliability Engineer'
] as const;

export const SimpleGameSetup = () => {
  const [gameMode, setGameMode] = useState<'create' | 'join' | 'history'>('create');
  const [hostName, setHostName] = useState('');
  const [hostRole, setHostRole] = useState<Player['role']>('Random');
  const [joinCode, setJoinCode] = useState('');
  const [joinPlayerName, setJoinPlayerName] = useState('');
  const [joinPlayerRole, setJoinPlayerRole] = useState<Player['role']>('Random');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const generateGameCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    console.log('🎲 Generated game code:', result, 'Length:', result.length, 'Regex test:', /^[A-Z0-9]{8}$/.test(result));
    return result;
  };

  const assignRandomRole = (role: Player['role']): Player['role'] => {
    if (role === 'Random') {
      const nonRandomRoles = AVAILABLE_ROLES.slice(1);
      return nonRandomRoles[Math.floor(Math.random() * nonRandomRoles.length)];
    }
    return role;
  };

  const handleCreateGame = async () => {
    if (!hostName.trim() || !user) return;
    
    setIsLoading(true);
    console.log('🚀 SIMPLE CREATE GAME - FIXED RLS INFINITE RECURSION');
    console.log('🔍 User auth state:', { user: user?.id, email: user?.email });
    
    try {
      const gameCode = generateGameCode();
      const finalHostRole = assignRandomRole(hostRole);

      console.log('📝 Creating game session with data:', {
        gameCode,
        hostName,
        finalHostRole
      });

      // Skip database connection test - go straight to insert
      console.log('📝 Inserting game session directly...');
      const { data: gameSession, error: sessionError } = await supabase
        .from('game_sessions')
        .insert({
          game_code: gameCode,
          host_name: hostName,
          status: 'waiting'
        })
        .select()
        .single();

      if (sessionError) {
        console.error('❌ Session creation error:', sessionError);
        throw new Error(`Failed to create game session: ${sessionError.message}`);
      }
      
      if (!gameSession) {
        throw new Error('Game session was not returned after creation');
      }
      
      console.log('✅ Game session created successfully:', gameSession);

      // Insert player
      console.log('👤 Adding host player...');
      const { data: playerData, error: playerError } = await supabase
        .from('game_players')
        .insert({
          game_session_id: gameSession.id,
          player_name: hostName,
          player_role: finalHostRole,
          player_order: 0,
          is_host: true,
          status: 'joined'
        })
        .select()
        .single();

      if (playerError) {
        console.error('❌ Player creation error:', playerError);
        // Try to clean up the session if player creation fails
        await supabase
          .from('game_sessions')
          .delete()
          .eq('id', gameSession.id);
        throw new Error(`Failed to add host player: ${playerError.message}`);
      }
      
      console.log('✅ Host player added successfully:', playerData);

      toast({
        title: "Game Created!",
        description: `Game room created with code: ${gameCode}`,
      });

      console.log('🎯 DIRECT REDIRECT - bypassing all callbacks');
      console.log('🔗 Redirect URL:', `/?mode=waiting&session=${gameSession.id}&host=true&name=${encodeURIComponent(hostName)}&code=${gameCode}`);
      
      // Immediate redirect since DB operations completed successfully
      window.location.href = `/?mode=waiting&session=${gameSession.id}&host=true&name=${encodeURIComponent(hostName)}&code=${gameCode}`;
      
    } catch (error) {
      console.error('❌ Game creation failed:', error);
      toast({
        title: "Error Creating Game",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinGame = async () => {
    if (!joinCode.trim() || !joinPlayerName.trim()) return;
    
    setIsLoading(true);
    
    try {
      const finalJoinRole = assignRandomRole(joinPlayerRole);
      
      const { data: session, error: sessionError } = await supabase
        .from('game_sessions')
        .select('*')
        .eq('game_code', joinCode.toUpperCase())
        .eq('status', 'waiting')
        .single();

      if (sessionError || !session) {
        throw new Error('Game not found or not accepting players');
      }

      const { data: existingPlayers } = await supabase
        .from('game_players')
        .select('player_name')
        .eq('game_session_id', session.id)
        .eq('status', 'joined');

      if (existingPlayers?.some(p => p.player_name === joinPlayerName)) {
        throw new Error('Player name already taken in this game');
      }

      const { error: playerError } = await supabase
        .from('game_players')
        .insert({
          game_session_id: session.id,
          player_name: joinPlayerName,
          player_role: finalJoinRole,
          player_order: (existingPlayers?.length || 0) + 1,
          is_host: false,
          status: 'joined'
        });

      if (playerError) throw new Error(playerError.message);

      toast({
        title: "Joined Game!",
        description: `Connected to game ${joinCode}`,
      });

      window.location.href = `/?mode=waiting&session=${session.id}&host=false&name=${encodeURIComponent(joinPlayerName)}&code=${joinCode}`;
      
    } catch (error) {
      console.error('Join game failed:', error);
      toast({
        title: "Error Joining Game",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (gameMode === 'history') {
    return <GameHistory onBack={() => setGameMode('create')} />;
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="container mx-auto max-w-4xl">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <Button
            variant="outline"
            onClick={() => setGameMode('history')}
            className="text-sm"
          >
            View Game History
          </Button>
          <AuthButton />
        </div>

        {/* Hero Section */}
        <div className="relative mb-8 overflow-hidden rounded-xl shadow-glow">
          <img 
            src={heroImage} 
            alt="DevOps Pipeline Game" 
            className="w-full h-64 object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
          <div className="absolute bottom-4 left-4 right-4">
            <h1 className="text-4xl font-bold mb-2 bg-gradient-primary bg-clip-text text-transparent">
              DevOps Pipeline Game
            </h1>
            <p className="text-muted-foreground text-lg">
              Cooperative multiplayer board game for learning Continuous Delivery and DevOps practices
            </p>
            <p className="text-muted-foreground text-sm mt-2">
              💡 {user ? 'Signed in with GitHub!' : 'Sign in with GitHub to save your progress!'}
            </p>
          </div>
        </div>

        {/* Game Mode Selection */}
        <div className="flex gap-4 mb-6">
          <Button
            variant={gameMode === 'create' ? 'default' : 'outline'}
            onClick={() => setGameMode('create')}
            className="flex-1"
          >
            <Users className="w-4 h-4 mr-2" />
            Create Game
          </Button>
          <Button
            variant={gameMode === 'join' ? 'default' : 'outline'}
            onClick={() => setGameMode('join')}
            className="flex-1"
          >
            <GamepadIcon className="w-4 h-4 mr-2" />
            Join Game
          </Button>
        </div>

        {gameMode === 'create' ? (
          <Card className="bg-gradient-card shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-6 h-6 text-primary" />
                Create New Game
              </CardTitle>
              <CardDescription>
                Set up a new multiplayer game and share the code with your team
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="host-name">Your Name (Host)</Label>
                <Input
                  id="host-name"
                  placeholder="Enter your name"
                  value={hostName}
                  onChange={(e) => setHostName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="host-role">Your Role</Label>
                <select
                  id="host-role"
                  value={hostRole}
                  onChange={(e) => setHostRole(e.target.value as Player['role'])}
                  className="w-full px-3 py-2 bg-background border border-input rounded-md"
                >
                  {AVAILABLE_ROLES.map(role => (
                    <option key={role} value={role}>{role}</option>
                  ))}
                </select>
              </div>

              <div className="pt-4">
                {!user ? (
                  <div className="text-center space-y-3">
                    <p className="text-muted-foreground text-sm">
                      Sign in with GitHub to create and host games
                    </p>
                    <AuthButton />
                  </div>
                ) : (
                  <Button
                    onClick={handleCreateGame}
                    disabled={!hostName.trim() || isLoading}
                    className="w-full bg-gradient-primary hover:opacity-90"
                    size="lg"
                  >
                    <Play className="w-5 h-5 mr-2" />
                    {isLoading ? 'Creating Game...' : 'Create Game'}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-gradient-card shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GamepadIcon className="w-6 h-6 text-primary" />
                Join Existing Game
              </CardTitle>
              <CardDescription>
                Enter the game code provided by the host to join
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="join-code">Game Code</Label>
                <Input
                  id="join-code"
                  placeholder="Enter 8-character game code"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  maxLength={8}
                  className="text-center text-2xl font-mono tracking-wider"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="join-player-name">Your Name</Label>
                <Input
                  id="join-player-name"
                  placeholder="Enter your name"
                  value={joinPlayerName}
                  onChange={(e) => setJoinPlayerName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="join-player-role">Your Role</Label>
                <select
                  id="join-player-role"
                  value={joinPlayerRole}
                  onChange={(e) => setJoinPlayerRole(e.target.value as Player['role'])}
                  className="w-full px-3 py-2 bg-background border border-input rounded-md"
                >
                  {AVAILABLE_ROLES.map(role => (
                    <option key={role} value={role}>{role}</option>
                  ))}
                </select>
              </div>

              <Button
                onClick={handleJoinGame}
                disabled={!joinCode.trim() || !joinPlayerName.trim() || isLoading}
                className="w-full bg-gradient-primary hover:opacity-90"
                size="lg"
              >
                <GamepadIcon className="w-5 h-5 mr-2" />
                {isLoading ? 'Joining Game...' : 'Join Game'}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};