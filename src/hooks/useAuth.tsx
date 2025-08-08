import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  signInWithGitHub: () => Promise<void>;
  signOut: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        // Log authentication events
        try {
          if (event === 'SIGNED_IN' && session?.user) {
            await supabase.rpc('log_audit_event', {
              p_event_type: 'authentication',
              p_event_action: 'sign_in',
              p_resource_type: 'user_session',
              p_metadata: {
                provider: session.user.app_metadata?.provider || 'unknown',
                timestamp: new Date().toISOString(),
                userAgent: navigator.userAgent
              },
              p_user_id: session.user.id
            });
          } else if (event === 'SIGNED_OUT') {
            await supabase.rpc('log_audit_event', {
              p_event_type: 'authentication',
              p_event_action: 'sign_out',
              p_resource_type: 'user_session',
              p_metadata: {
                timestamp: new Date().toISOString(),
                userAgent: navigator.userAgent
              },
              p_user_id: null
            });
          }
        } catch (error) {
          console.error('Failed to log auth event:', error);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithGitHub = async () => {
    const redirectUrl = `${window.location.origin}/`;
    
    // Log sign-in attempt
    try {
      await supabase.rpc('log_audit_event', {
        p_event_type: 'authentication',
        p_event_action: 'sign_in_attempt',
        p_resource_type: 'user_session',
        p_metadata: {
          provider: 'github',
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          redirectUrl
        },
        p_user_id: null
      });
    } catch (logError) {
      console.error('Failed to log sign-in attempt:', logError);
    }
    
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: redirectUrl
      }
    });
    
    if (error) {
      console.error('Error signing in with GitHub:', error);
      throw error;
    }
  };

  const signOut = async () => {
    console.log('🔓 Starting sign out process...');
    
    // Log sign-out attempt
    try {
      await supabase.rpc('log_audit_event', {
        p_event_type: 'authentication',
        p_event_action: 'sign_out_attempt',
        p_resource_type: 'user_session',
        p_metadata: {
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent
        },
        p_user_id: user?.id || null
      });
    } catch (logError) {
      console.error('Failed to log sign-out attempt:', logError);
    }
    
    console.log('🔓 Calling supabase.auth.signOut()...');
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      console.error('❌ Error signing out:', error);
      throw error;
    }
    
    console.log('✅ Sign out successful');
    
    // Force page reload to clear all state
    window.location.href = '/';
  };

  return (
    <AuthContext.Provider 
      value={{ 
        user, 
        session, 
        signInWithGitHub, 
        signOut, 
        loading 
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};