/**
 * Test exact same code as the app
 */

// Simulate the same imports
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://fcwlovxpywymzirmzoql.supabase.co';
const supabaseKey = 'sb_publishable_sSG3_Ru-PlBft3ReptnN7g_Ar2AMGYI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testExactCode() {
  console.log('='.repeat(60));
  console.log('Test exact same code as the app');
  console.log('='.repeat(60));

  // Test fetchBooks (same as api.ts)
  console.log('\n[1] Testing fetchBooks (same as api.ts)...');
  try {
    const { data, error } = await supabase
      .from('books')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.log('❌ Error:', error.message);
      console.log('   Code:', error.code);
      console.log('   Details:', error.details);
      console.log('   Hint:', error.hint);
    } else {
      console.log('✅ Success! Rows:', data.length);
    }
  } catch (err) {
    console.log('❌ Exception:', err.message);
  }

  // Test createBook (same as api.ts)
  console.log('\n[2] Testing createBook (same as api.ts)...');
  const testId = 'test-' + Date.now();
  try {
    const { data, error } = await supabase
      .from('books')
      .insert({
        id: testId,
        title: 'Test Book',
        author: 'Test Author',
        category: 'تست',
        description: 'Test description',
        cover_url: null,
        cover_color: '#31517a',
        is_poetry: false,
        minutes: 10,
        year: '1400',
        pages: 100,
        tags: ['test'],
        chapters: [],
        is_uploaded: true,
        uploader_id: null,
        pdf_path: null,
      })
      .select()
      .single();

    if (error) {
      console.log('❌ Insert Error:', error.message);
      console.log('   Code:', error.code);
      console.log('   Details:', error.details);
    } else {
      console.log('✅ Insert Success!');
      console.log('   Data:', data);

      // Test fetch again
      console.log('\n[3] Testing fetchBooks after insert...');
      const { data: booksData, error: fetchError } = await supabase
        .from('books')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) {
        console.log('❌ Fetch Error:', fetchError.message);
      } else {
        console.log('✅ Fetch Success! Rows:', booksData.length);
      }

      // Clean up
      console.log('\n[4] Cleaning up...');
      await supabase.from('books').delete().eq('id', testId);
    }
  } catch (err) {
    console.log('❌ Exception:', err.message);
  }

  console.log('\n' + '='.repeat(60));
  console.log('Test Complete');
  console.log('='.repeat(60));
}

testExactCode();
