// lib/supabaseClient.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_KEY!;
const supabaseServiceKey = process.env.SUPABASE_PUBLIC_ANNON!;

export const supabase = createClient(supabaseUrl, supabaseServiceKey);
