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
    console.log('=== STARTING GAME CREATION ===');
    console.log('Step 1: User authentication check:', user?.id);
    console.log('Step 2: Host name:', hostName);
    console.log('Step 3: Host role:', hostRole);
    
    try {
      console.log('Step 4: Generating game code...');
      const gameCode = await generateGameCode();
      console.log('Step 5: Generated game code:', gameCode);
      
      const finalHostRole = assignRandomRole(hostRole);
      console.log('Step 6: Final host role:', finalHostRole);

      console.log('Step 7: Creating game session and adding host player...');
      console.log('Step 7.1: Checking Supabase client...', !!supabase);
      
      let gameSession: any;
      
      try {
        // COMPREHENSIVE DEBUG: Test all aspects before game creation
        console.log('Step 7.2: Testing Supabase connectivity...');
        
        // Test 1: Check auth state
        const { data: authUser, error: authError } = await supabase.auth.getUser();
        console.log('Auth test:', { user: authUser?.user?.id, error: authError });
        
        // Test 2: Test simple SELECT
        const { data: testSelect, error: selectError } = await supabase
          .from('game_sessions')
          .select('id')
          .limit(1);
        console.log('SELECT test:', { data: testSelect, error: selectError });
        
        // Test 3: Now try INSERT
        console.log('Step 7.3: Creating game session via Supabase client...');
        const { data: gameSessionData, error: sessionError } = await supabase
          .from('game_sessions')
          .insert({
            game_code: gameCode,
            host_name: hostName,
            status: 'waiting'
          })
          .select()
          .single();
        
        console.log('INSERT result:', { data: gameSessionData, error: sessionError });
        
        if (sessionError) {
          console.error('Create game session failed:', sessionError);
          throw new Error(`Failed to create game: ${sessionError.message}`);
        }
        
        gameSession = gameSessionData;
        console.log('Step 7.3: Game session created:', gameSession);
        
        // Add host player via Supabase client
        const { error: playerError } = await supabase
          .from('game_players')
          .insert({
            game_session_id: gameSession.id,
            player_name: hostName,
            player_role: finalHostRole,
            player_order: 0,
            is_host: true,
            status: 'joined'
          });
        
        if (playerError) {
          console.error('Add player failed:', playerError);
          throw new Error(`Failed to add host player: ${playerError.message}`);
        }
        
        console.log('Step 8: Host player added successfully');
        
      } catch (dbError) {
        console.error('Database operation failed:', dbError);
        throw dbError;
      }

      console.log('Step 9: Success! Game and host player created');

      console.log('Step 10: Logging audit event (async)...');
      // Use async logging to prevent blocking
      logGameEvent('create', gameSession.id, {
        gameCode,
        hostName,
        hostRole: finalHostRole
      }).catch(auditError => {
        console.warn('Audit logging failed but continuing:', auditError);
      });
      console.log('Step 10 SUCCESS - Audit event queued');

      console.log('Step 11: Showing success message...');
      toast({
        title: "Game Created!",
        description: `Game room created with code: ${gameCode}`,
      });
      console.log('Step 11 SUCCESS - Toast shown');

      console.log('Step 12: Storing session data...');
      secureSessionStorage.set('current_game', {
        gameCode,
        sessionId: gameSession.id,
        timestamp: Date.now()
      });
      console.log('Step 12 SUCCESS - Session data stored');
      
      console.log('Step 13: About to call onEnterWaitingRoom...');
      console.log('onEnterWaitingRoom function:', typeof onEnterWaitingRoom);
      console.log('gameSession.id:', gameSession.id);
      console.log('hostName:', hostName);
      
      onEnterWaitingRoom(gameSession.id, true, hostName);
      console.log('Step 13 SUCCESS - onEnterWaitingRoom called');
      
      console.log('=== GAME CREATION COMPLETED SUCCESSFULLY ===');
      
    } catch (error) {
      console.error('=== GAME CREATION FAILED ===');
      console.error('Error details:', error);
      console.error('Error type:', typeof error);
      console.error('Error message:', error instanceof Error ? error.message : String(error));
      
      toast({
        title: "Error Creating Game",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      console.log('=== GAME CREATION PROCESS ENDED ===');
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