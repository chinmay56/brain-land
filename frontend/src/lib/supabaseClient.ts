import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://fkrsaryjeybgwnazqkum.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZrcnNhcnlqZXliZ3duYXpxa3VtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc4MjAxNjUsImV4cCI6MjEwMzM5NjE2NX0.ykuaQJoWfkF03jpebH9Bzdct70hryam9TwEyJeNxQxs';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
