
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zdyzxhngkvlbmfhaljel.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpkeXp4aG5na3ZsYm1maGFsamVsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAyMTgyNzgsImV4cCI6MjA1NTc5NDI3OH0.fJe1VM6Rkg3MOb9C09o4-7ru4CbE9ZwUJ8h4qQqLgJM';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
  },
});
