import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://fkrsaryjeybgwnazqkum.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZrcnNhcnlqZXliZ3duYXpxa3VtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc4MjAxNjUsImV4cCI6MjEwMzM5NjE2NX0.ykuaQJoWfkF03jpebH9Bzdct70hryam9TwEyJeNxQxs';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testSupabaseAuth() {
  console.log('--- Testing Supabase Auth & Connectivity ---');
  console.log('Target URL:', supabaseUrl);

  try {
    // 1. Check Auth health / get session
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
      console.log('Session Error:', sessionError.message);
    } else {
      console.log('Auth API Status: ACTIVE (Session check succeeded)');
    }

    // 2. Test Auth endpoint with a dummy check (e.g. signInWithPassword test)
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'test_health_check@nic.in',
      password: 'invalid_password_for_check_123'
    });

    if (authError) {
      console.log('Auth Service Response:', authError.message);
      if (authError.message.includes('Invalid login credentials') || authError.status === 400) {
        console.log('SUCCESS: Supabase Auth server responded correctly (400 Invalid Credentials as expected).');
      }
    } else {
      console.log('Auth Sign-In Data:', authData);
    }

    // 3. Test Database Connectivity (reading land_records table if created)
    const { data: dbData, error: dbError } = await supabase
      .from('land_records')
      .select('id, document_type, status')
      .limit(5);

    if (dbError) {
      console.log('Database Table Check:', dbError.message);
      if (dbError.code === '42P01') {
        console.log('Note: "land_records" table not created yet. Run backend/supabase_schema.sql in Supabase SQL editor.');
      }
    } else {
      console.log('Database Table "land_records" Status: READY. Found rows:', dbData.length);
      console.log(dbData);
    }

  } catch (err) {
    console.error('Connection Exception:', err);
  }
}

testSupabaseAuth();
