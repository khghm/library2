/**
 * Supabase Auth Test Script
 * Tests the sign-up flow to identify issues
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://fcwlovxpywymzirmzoql.supabase.co';
const supabaseKey = 'sb_publishable_sSG3_Ru-PlBft3ReptnN7g_Ar2AMGYI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testSignUp() {
  console.log('='.repeat(60));
  console.log('Supabase Auth Test');
  console.log('='.repeat(60));

  const testEmail = `test.user${Date.now()}@gmail.com`;
  const testPassword = 'test123456';
  const testDisplayName = 'Test User';

  console.log(`\nTest email: ${testEmail}`);
  console.log(`Test password: ${testPassword}`);

  // Test 1: Sign Up
  console.log('\n[1] Testing sign up...');
  try {
    const { data, error } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        data: { display_name: testDisplayName },
      },
    });

    if (error) {
      console.log('❌ Sign up error:', error.message);
      console.log('   Status:', error.status);
      console.log('   Name:', error.name);
    } else {
      console.log('✅ Sign up successful!');
      console.log('   User:', data.user?.id);
      console.log('   Session:', data.session ? 'Active' : 'None');
      console.log('   User metadata:', data.user?.user_metadata);

      // Test 2: Check if profile was created
      console.log('\n[2] Checking if profile was created...');
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();

      if (profileError) {
        console.log('❌ Profile not found:', profileError.message);
        console.log('   The trigger "on_auth_user_created" might not exist.');
      } else {
        console.log('✅ Profile created!');
        console.log('   Profile:', profile);
      }

      // Test 3: Check if reader_settings was created
      console.log('\n[3] Checking if reader_settings was created...');
      const { data: settings, error: settingsError } = await supabase
        .from('reader_settings')
        .select('*')
        .eq('user_id', data.user.id);

      if (settingsError) {
        console.log('❌ Settings error:', settingsError.message);
      } else if (settings && settings.length > 0) {
        console.log('✅ Settings created!');
        console.log('   Settings:', settings[0]);
      } else {
        console.log('⚠️ Settings not found - creating manually...');
        const { error: createError } = await supabase
          .from('reader_settings')
          .insert({ user_id: data.user.id });
        if (createError) {
          console.log('❌ Failed to create settings:', createError.message);
        } else {
          console.log('✅ Settings created manually');
        }
      }

      // Test 4: Sign out
      console.log('\n[4] Signing out...');
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) {
        console.log('❌ Sign out error:', signOutError.message);
      } else {
        console.log('✅ Signed out successfully');
      }
    }
  } catch (err) {
    console.log('❌ Unexpected error:', err.message);
  }

  console.log('\n' + '='.repeat(60));
  console.log('Test Complete');
  console.log('='.repeat(60));
}

testSignUp();
