/**
 * Supabase Trigger Test
 * Checks if the trigger function exists and works correctly
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://fcwlovxpywymzirmzoql.supabase.co';
const supabaseKey = 'sb_publishable_sSG3_Ru-PlBft3ReptnN7g_Ar2AMGYI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testTrigger() {
  console.log('='.repeat(60));
  console.log('Supabase Trigger Test');
  console.log('='.repeat(60));

  // Test 1: Check if profiles table exists
  console.log('\n[1] Checking profiles table...');
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('*')
    .limit(1);

  if (profilesError) {
    console.log('❌ Profiles table error:', profilesError.message);
  } else {
    console.log('✅ Profiles table exists');
  }

  // Test 2: Check if reader_settings table exists
  console.log('\n[2] Checking reader_settings table...');
  const { data: settings, error: settingsError } = await supabase
    .from('reader_settings')
    .select('*')
    .limit(1);

  if (settingsError) {
    console.log('❌ Reader settings table error:', settingsError.message);
  } else {
    console.log('✅ Reader settings table exists');
  }

  // Test 3: Try direct insert to profiles (bypassing trigger)
  console.log('\n[3] Testing direct insert to profiles...');
  const testId = '00000000-0000-0000-0000-000000000001';
  const { error: insertError } = await supabase
    .from('profiles')
    .insert({
      id: testId,
      email: 'test_direct@example.com',
      display_name: 'Direct Test',
    });

  if (insertError) {
    console.log('❌ Direct insert error:', insertError.message);
    console.log('   Code:', insertError.code);
  } else {
    console.log('✅ Direct insert successful');
    // Clean up
    await supabase.from('profiles').delete().eq('id', testId);
  }

  // Test 4: Check auth.users table structure
  console.log('\n[4] Checking auth schema...');
  const { data: authUsers, error: authError } = await supabase
    .rpc('get_auth_users');

  if (authError) {
    console.log('ℹ️ Cannot query auth.users directly (expected)');
  }

  // Test 5: Try sign up with error details
  console.log('\n[5] Testing sign up with full error details...');
  const testEmail = `test_${Date.now()}@example.com`;
  const { data, error } = await supabase.auth.signUp({
    email: testEmail,
    password: 'test123456',
    options: {
      data: { display_name: 'Test User' },
    },
  });

  if (error) {
    console.log('❌ Sign up error:');
    console.log('   Message:', error.message);
    console.log('   Status:', error.status);
    console.log('   Name:', error.name);
    console.log('   Stack:', error.stack?.split('\n').slice(0, 3).join('\n'));
  } else {
    console.log('✅ Sign up successful!');
    console.log('   User ID:', data.user?.id);
  }

  console.log('\n' + '='.repeat(60));
  console.log('Test Complete');
  console.log('='.repeat(60));
}

testTrigger();
