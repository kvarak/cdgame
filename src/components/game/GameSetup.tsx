import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, Minus, Users, Play, GamepadIcon } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import heroImage from "@/assets/devops-hero.jpg";
import { validatePlayerName, validateGameCode } from "@/lib/validation";
import { isRateLimited, sanitizeErrorMessage, secureSessionStorage } from "@/lib/security";
import { useAuditLogger } from "@/hooks/useAuditLogger";
import { useGameRoom } from "@/hooks/useGameRoom";
import { VersionDisplay } from "@/components/ui/version-display";
import { useAuth } from "@/hooks/useAuth";
import { AuthButton } from "@/components/auth/AuthButton";

interface Player {
  id: string;
  name: string;
  role: 'Developer' | 'QA Engineer' | 'DevOps Engineer' | 'Product Owner' | 'Security Engineer' | 'Site Reliability Engineer' | 'Random';
}

interface GameSetupProps {
  onStartGame: (players: Player[], gameCode: string, gameSessionId: string) => void;
  onEnterWaitingRoom: (gameSessionId: string, isHost: boolean, playerName: string) => void;
  onViewHistory?: () => void;
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

const ROLE_COLORS = {
  'Random': 'bg-gradient-primary text-white',
  'Developer': 'bg-pipeline-dev text-pipeline-dev-foreground',
  'QA Engineer': 'bg-pipeline-test text-pipeline-test-foreground',
  'DevOps Engineer': 'bg-pipeline-deploy text-pipeline-deploy-foreground',
  'Product Owner': 'bg-primary text-primary-foreground',
  'Security Engineer': 'bg-error text-error-foreground',
  'Site Reliability Engineer': 'bg-pipeline-monitor text-pipeline-monitor-foreground'
};

export const GameSetup = ({ onStartGame, onEnterWaitingRoom, onViewHistory }: GameSetupProps) => {
  const [gameMode, setGameMode] = useState<'create' | 'join'>('create');
  const [hostName, setHostName] = useState('');
  const [hostRole, setHostRole] = useState<Player['role']>('Random');
  const [joinCode, setJoinCode] = useState('');
  const [joinPlayerName, setJoinPlayerName] = useState('');
  const [joinPlayerRole, setJoinPlayerRole] = useState<Player['role']>('Random');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { logGameEvent } = useAuditLogger();
  const { joinGame } = useGameRoom();
  const { user } = useAuth();

  const assignRandomRole = (role: Player['role']): Player['role'] => {
    if (role === 'Random') {
      const nonRandomRoles = AVAILABLE_ROLES.slice(1); // Exclude 'Random'
      return nonRandomRoles[Math.floor(Math.random() * nonRandomRoles.length)];
    }
    return role;
  };

  const generateGameCode = async () => {
    console.log('Starting generateGameCode...');
    console.log('Using client-side generation...');
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    console.log('Generated code:', result);
    return result;
  };

  const canCreateGame = hostName.trim() !== '';
  const canJoinGame = joinCode.trim() !== '' && joinPlayerName.trim() !== '';

  const handleCreateGame = async () => {
    if (!canCreateGame) return;
    
    // Rate limiting check
    if (isRateLimited('create_game', 3, 60000)) {
      toast({
        title: "Too Many Attempts",
        description: "Please wait before creating another game.",
        variant: "destructive",
      });
      return;
    }
    
    // Validate host name
    const validation = validatePlayerName(hostName);
    if (!validation.isValid) {
      toast({
        title: "Invalid Host Name",
        description: validation.error,
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);
    console.log('Creating game with user:', user?.id, 'hostName:', hostName);
    
    try {
      const gameCode = await generateGameCode();
      console.log('Generated game code:', gameCode);
      const finalHostRole = assignRandomRole(hostRole);

      console.log('Creating game session with Supabase client...');
      
      // Create game session using Supabase client
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
        console.error('Session error:', sessionError);
        throw sessionError;
      }
      
      console.log('Game session created:', gameSession);

      // Create host player record
      console.log('Creating host player record...');
      const { error: hostError } = await supabase
        .from('game_players')
        .insert({
          game_session_id: gameSession.id,
          player_name: hostName,
          player_role: finalHostRole,
          player_order: 0,
          is_host: true,
          status: 'joined'
        });

      if (hostError) {
        console.error('Host error:', hostError);
        throw hostError;
      }
      console.log('Host player record created successfully');

      // Log game creation event
      await logGameEvent('create', gameSession.id, {
        gameCode,
        hostName,
        hostRole: finalHostRole
      });

      toast({
        title: "Game Created!",
        description: `Game room created with code: ${gameCode}`,
      });

      // Store game session securely
      secureSessionStorage.set('current_game', {
        gameCode,
        sessionId: gameSession.id,
        timestamp: Date.now()
      });
      
      // Enter waiting room as host
      onEnterWaitingRoom(gameSession.id, true, hostName);
    } catch (error) {
      console.error('Error creating local game:', error);
      toast({
        title: "Error Creating Game",
        description: "Failed to create game session",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinGame = async () => {
    if (!canJoinGame) return;
    
    // Rate limiting check
    if (isRateLimited('join_game', 5, 60000)) {
      toast({
        title: "Too Many Attempts",
        description: "Please wait before trying to join another game.",
        variant: "destructive",
      });
      return;
    }
    
    // Validate game code and player name
    const codeValidation = validateGameCode(joinCode);
    if (!codeValidation.isValid) {
      toast({
        title: "Invalid Game Code",
        description: codeValidation.error,
        variant: "destructive",
      });
      return;
    }

    const nameValidation = validatePlayerName(joinPlayerName);
    if (!nameValidation.isValid) {
      toast({
        title: "Invalid Player Name",
        description: nameValidation.error,
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);
    try {
      // Assign random role if needed
      const finalJoinRole = assignRandomRole(joinPlayerRole);
      
      // Join the game using the hook
      const result = await joinGame(codeValidation.sanitized, joinPlayerName, finalJoinRole);

      toast({
        title: "Joined Game!",
        description: `Connected to game ${codeValidation.sanitized}`,
      });

      // Store game session securely
      secureSessionStorage.set('current_game', {
        gameCode: codeValidation.sanitized,
        sessionId: result.session_id,
        timestamp: Date.now()
      });
      
      // Enter waiting room as player
      onEnterWaitingRoom(result.session_id, false, joinPlayerName);
    } catch (error) {
      console.error('Error joining game:', error);
      const sanitizedError = sanitizeErrorMessage(error);
      toast({
        title: "Error Joining Game",
        description: sanitizedError,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="container mx-auto max-w-4xl">
        {/* Header with Auth Button */}
        <div className="flex justify-between items-center mb-4">
          <div className="flex-1" />
          <AuthButton onViewHistory={onViewHistory} />
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
              💡 {user ? 'Signed in with GitHub - your progress is being tracked!' : 'Sign in with GitHub to save your game history and track your progress!'}
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
          /* Create Game */
          <Card className="bg-gradient-card shadow-card animate-slide-in">
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
              {/* Host Name */}
              <div className="space-y-2">
                <Label htmlFor="host-name" className="text-base font-medium">
                  Your Name (Host)
                </Label>
                <Input
                  id="host-name"
                  placeholder="Enter your name"
                  value={hostName}
                  onChange={(e) => setHostName(e.target.value)}
                />
              </div>

              {/* Host Role */}
              <div className="space-y-2">
                <Label htmlFor="host-role" className="text-base font-medium">
                  Your Role
                </Label>
                <select
                  id="host-role"
                  value={hostRole}
                  onChange={(e) => setHostRole(e.target.value as Player['role'])}
                  className="w-full px-3 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {AVAILABLE_ROLES.map(role => (
                    <option key={role} value={role}>{role}</option>
                  ))}
                </select>
              </div>

              {/* Game Info */}
              <div className="bg-muted/50 p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  <strong>Note:</strong> After creating the game, you'll enter a waiting room where other players can join using the game code. You can start the game when ready.
                </p>
              </div>

              {/* Start Game Button */}
              <div className="pt-4">
                {!user ? (
                  <div className="text-center space-y-3">
                    <p className="text-muted-foreground text-sm">
                      Sign in with GitHub to create and host games
                    </p>
                    <AuthButton />
                  </div>
                ) : (
                  <>
                    <Button
                      onClick={handleCreateGame}
                      disabled={!canCreateGame || isLoading}
                      className="w-full bg-gradient-primary hover:opacity-90 transition-opacity"
                      size="lg"
                    >
                      <Play className="w-5 h-5 mr-2" />
                      {isLoading ? 'Creating Game...' : 'Create Game'}
                    </Button>
                    {!canCreateGame && (
                      <p className="text-muted-foreground text-sm mt-2 text-center">
                        Please enter your name to create the game
                      </p>
                    )}
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          /* Join Game */
          <Card className="bg-gradient-card shadow-card animate-slide-in">
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
                <Label htmlFor="join-code" className="text-base font-medium">
                  Game Code
                </Label>
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
                <Label htmlFor="join-player-name" className="text-base font-medium">
                  Your Name
                </Label>
                <Input
                  id="join-player-name"
                  placeholder="Enter your name"
                  value={joinPlayerName}
                  onChange={(e) => setJoinPlayerName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="join-player-role" className="text-base font-medium">
                  Your Role
                </Label>
                <select
                  id="join-player-role"
                  value={joinPlayerRole}
                  onChange={(e) => setJoinPlayerRole(e.target.value as Player['role'])}
                  className="w-full px-3 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {AVAILABLE_ROLES.map(role => (
                    <option key={role} value={role}>{role}</option>
                  ))}
                </select>
              </div>

              <Button
                onClick={handleJoinGame}
                disabled={!canJoinGame || isLoading}
                className="w-full bg-gradient-primary hover:opacity-90 transition-opacity"
                size="lg"
              >
                <GamepadIcon className="w-5 h-5 mr-2" />
                {isLoading ? 'Joining Game...' : 'Join Game'}
              </Button>
            </CardContent>
          </Card>
        )}
        
        {/* Version Display */}
        <div className="flex justify-center mt-8 pb-4">
          <VersionDisplay />
        </div>
      </div>
    </div>
  );
};