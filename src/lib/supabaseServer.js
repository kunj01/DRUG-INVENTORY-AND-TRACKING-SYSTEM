
// Server-side Supabase client
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = "https://mmnxrploqtbztkghziev.supabase.co";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || "your-service-key-should-be-set-in-env";

// Create Supabase client with server-side authentication
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Add a simple error handling wrapper for Supabase operations
const safeSupabaseQuery = async (queryFn) => {
  try {
    const result = await queryFn();
    
    if (result.error) {
      console.error('Supabase query error:', result.error);
      throw result.error;
    }
    
    return result;
  } catch (error) {
    console.error('Supabase server query error:', error);
    throw error;
  }
};

module.exports = { supabase, safeSupabaseQuery };
