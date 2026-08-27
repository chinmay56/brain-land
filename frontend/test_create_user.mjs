import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://fkrsaryjeybgwnazqkum.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZrcnNhcnlqZXliZ3duYXpxa3VtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc4MjAxNjUsImV4cCI6MjEwMzM5NjE2NX0.ykuaQJoWfkF03jpebH9Bzdct70hryam9TwEyJeNxQxs';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testCreateUser() {
  console.log('--- Registering Test User in Supabase Auth ---');

  const testEmail = `citizen_${Date.now()}@gmail.com`;
  const testPassword = 'SecurePassword2026!';

  const { data, error } = await supabase.auth.signUp({
    email: testEmail,
    password: testPassword,
    options: {
      data: {
        full_name: 'Ramesh Baliram Patil',
        role: 'CITIZEN',
        phone_number: '9823456789',
        district: 'Pune',
        tehsil: 'Haveli'
      }
    }
  });

  if (error) {
    console.error('Sign Up Error:', error.message);
  } else {
    console.log('SUCCESS: User created in Supabase Auth!');
    console.log('User ID:', data.user?.id);
    console.log('User Email:', data.user?.email);
    console.log('Metadata:', data.user?.user_metadata);
  }
}

testCreateUser();
