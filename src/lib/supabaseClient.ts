// src/lib/supabaseClient.ts

import { createClient } from '@supabase/supabase-js';

// Get the Supabase URL and anonymous key from the environment variables
const supabaseUrl = import.meta.env.VITE_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY;

// Create and export the Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);