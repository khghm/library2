/**
 * Supabase Detailed Error Test
 * Checks trigger, function, and provides detailed error info
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://fcwlovxpywymzirmzoql.supabase.co';
const supabaseKey = 'sb_publishable_sSG3_Ru-PlBft3ReptnN7g_Ar2AMGYI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testDetailed() {
  console.log('='.repeat(60));
  console.log('Supabase Detailed Error Test');
  console.log('='.repeat(60));

  // Test 1: Check if we can create a user directly via admin API
  console.log('\n[1] Testing admin create user...');
  const testEmail = `test_${Date.now()}@example.com`;

  // Try using rpc to create a test function
  const { data: rpcData, error: rpcError } = await supabase.rpc('handle_new_user_test', {
    user_id: '00000000-0000-0000-0000-000000000002',
    user_email: testEmail,
    user_display_name: 'Test',
  });

  if (rpcError) {
    console.log('ℹ️ RPC test (expected to fail):', rpcError.message);
  }

  // Test 2: Check if function exists by querying pg_proc
  console.log('\n[2] Checking if handle_new_user function exists...');
  const { data: funcData, error: funcError } = await supabase.rpc('check_function_exists', {
    func_name: 'handle_new_user',
  });

  if (funcError) {
    console.log('ℹ️ Function check (expected to fail):', funcError.message);
  }

  // Test 3: Try sign up and capture full error
  console.log('\n[3] Testing sign up with detailed error...');
  const { data, error } = await supabase.auth.signUp({
    email: testEmail,
    password: 'test123456',
  });

  if (error) {
    console.log('❌ Error details:');
    console.log('   Message:', error.message);
    console.log('   Status:', error.status);
    console.log('   Name:', error.name);

    // Try to get more details
    console.log('\n   Full error object:', JSON.stringify(error, null, 2));
  } else {
    console.log('✅ Sign up successful!');
    console.log('   User:', data.user?.id);
  }

  // Test 4: Check Supabase Auth settings
  console.log('\n[4] Checking auth settings...');
  console.log('   URL:', supabaseUrl);
  console.log('   Key (first 20 chars):', supabaseKey.substring(0, 20) + '...');

  console.log('\n' + '='.repeat(60));
  console.log('RECOMMENDATION:');
  console.log('='.repeat(60));
  console.log('The trigger function might not exist or has errors.');
  console.log('');
  console.log('Please run this SQL in Supabase SQL Editor:');
  console.log('');
  console.log(`
-- Drop and recreate the function
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  );

  INSERT INTO reader_settings (user_id)
  VALUES (NEW.id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
`);
  console.log('='.repeat(60));
}

testDetailed();
