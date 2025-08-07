import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface AuditEvent {
  eventType: string;
  eventAction: string;
  resourceType?: string;
  resourceId?: string;
  metadata?: Record<string, any>;
}

export const useAuditLogger = () => {
  const { user } = useAuth();

  const logEvent = useCallback(async (event: AuditEvent) => {
    try {
      const { data, error } = await supabase.rpc('log_audit_event', {
        p_event_type: event.eventType,
        p_event_action: event.eventAction,
        p_resource_type: event.resourceType || null,
        p_resource_id: event.resourceId || null,
        p_metadata: event.metadata || {},
        p_user_id: user?.id || null
      });

      if (error) {
        console.error('Failed to log audit event:', error);
      }

      return data;
    } catch (error) {
      console.error('Error logging audit event:', error);
    }
  }, [user?.id]);

  const logGameEvent = useCallback(async (
    action: 'create' | 'join' | 'start' | 'end' | 'player_join' | 'role_change',
    gameSessionId?: string,
    metadata?: Record<string, any>
  ) => {
    return logEvent({
      eventType: 'game',
      eventAction: action,
      resourceType: 'game_session',
      resourceId: gameSessionId,
      metadata: {
        ...metadata,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href
      }
    });
  }, [logEvent]);

  const logAuthEvent = useCallback(async (
    action: 'sign_in' | 'sign_out' | 'sign_in_attempt' | 'sign_out_attempt',
    metadata?: Record<string, any>
  ) => {
    return logEvent({
      eventType: 'authentication',
      eventAction: action,
      resourceType: 'user_session',
      metadata: {
        ...metadata,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href
      }
    });
  }, [logEvent]);

  return {
    logEvent,
    logGameEvent,
    logAuthEvent
  };
};