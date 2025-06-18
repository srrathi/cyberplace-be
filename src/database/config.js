const { createClient } = require('@supabase/supabase-js');
const { logger } = require('../utils/logger');

let supabase = null;

const initializeDatabase = async () => {
  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase configuration');
    }

    supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });

    // Test connection
    const { data, error } = await supabase.from('users').select('count').limit(1);
    if (error && error.code !== 'PGRST116') { // PGRST116 is "table not found" which is ok for initial setup
      throw error;
    }

    logger.info('Supabase connection established');
    return supabase;
  } catch (error) {
    logger.error('Database initialization failed:', error);
    throw error;
  }
};

const getSupabaseClient = () => {
  if (!supabase) {
    logger.error('Supabase client not initialized');
    throw new Error('Database not initialized. Call initializeDatabase first.');
  }
  return supabase;
};

module.exports = {
  initializeDatabase,
  getSupabaseClient,
};