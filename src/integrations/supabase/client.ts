// This file is automatically generated. Do not edit it directly.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://zdyzxhngkvlbmfhaljel.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpkeXp4aG5na3ZsYm1maGFsamVsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAyMTgyNzgsImV4cCI6MjA1NTc5NDI3OH0.fJe1VM6Rkg3MOb9C09o4-7ru4CbE9ZwUJ8h4qQqLgJM";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);