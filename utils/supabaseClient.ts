// Supabase client configuration for OrderPrep backup system

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Only create Supabase client if credentials are configured
let supabaseInstance: SupabaseClient | null = null;

if (supabaseUrl && supabaseAnonKey) {
  supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false, // We handle auth separately
      autoRefreshToken: false,
    },
  });
  console.log('✅ Supabase client initialized successfully');
} else {
  console.warn('⚠️ Supabase credentials not configured. Cloud backup functionality will be disabled.');
}

// Export Supabase client (can be null if not configured)
export const supabase = supabaseInstance;

// Storage bucket name
export const BACKUP_BUCKET = 'orderprep-backups';
