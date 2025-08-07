import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface Database {
  public: {
    Tables: {
      game_sessions: {
        Row: {
          id: string
          created_at: string
          status: string
        }
      }
    }
    Functions: {
      cleanup_old_games: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
    }
  }
}

Deno.serve(async (req) => {
  try {
    // Create Supabase client with service role key for admin operations
    const supabase = createClient<Database>(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Execute cleanup function
    const { error } = await supabase.rpc('cleanup_old_games')
    
    if (error) {
      console.error('Error cleaning up games:', error)
      return new Response(
        JSON.stringify({ 
          error: 'Failed to cleanup games',
          details: error.message 
        }),
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    // Log success
    console.log('Game cleanup completed successfully')

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Game cleanup completed',
        timestamp: new Date().toISOString()
      }),
      { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Unexpected error during game cleanup:', error)
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: 'An unexpected error occurred during cleanup'
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
})