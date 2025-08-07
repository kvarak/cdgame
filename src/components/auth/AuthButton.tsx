import { useState } from 'react';
import { Github, LogOut, User, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface AuthButtonProps {
  onViewHistory?: () => void;
}

export const AuthButton = ({ onViewHistory }: AuthButtonProps) => {
  const { user, signInWithGitHub, signOut, loading } = useAuth();
  const { toast } = useToast();
  const [signingIn, setSigningIn] = useState(false);

  const handleSignIn = async () => {
    try {
      setSigningIn(true);
      await signInWithGitHub();
    } catch (error) {
      toast({
        title: "Sign in failed",
        description: "Failed to sign in with GitHub. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      toast({
        title: "Signed out",
        description: "You have been signed out successfully.",
      });
    } catch (error) {
      toast({
        title: "Sign out failed",
        description: "Failed to sign out. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <Button variant="ghost" disabled>Loading...</Button>;
  }

  if (!user) {
    return (
      <Button 
        onClick={handleSignIn} 
        disabled={signingIn}
        variant="outline"
        className="gap-2"
      >
        <Github className="h-4 w-4" />
        {signingIn ? 'Signing in...' : 'Sign in with GitHub'}
      </Button>
    );
  }

  const avatarUrl = user.user_metadata?.avatar_url;
  const username = user.user_metadata?.user_name || user.email;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="gap-2 p-2">
          <Avatar className="h-8 w-8">
            <AvatarImage src={avatarUrl} alt={username} />
            <AvatarFallback>
              <User className="h-4 w-4" />
            </AvatarFallback>
          </Avatar>
          <span className="hidden sm:inline">{username}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem disabled className="flex items-center gap-2">
          <User className="h-4 w-4" />
          <span className="font-medium">{username}</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {onViewHistory && (
          <DropdownMenuItem 
            onClick={onViewHistory}
            className="flex items-center gap-2 cursor-pointer"
          >
            <History className="h-4 w-4" />
            View Game History
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          onClick={handleSignOut}
          className="flex items-center gap-2 cursor-pointer text-destructive focus:text-destructive"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};