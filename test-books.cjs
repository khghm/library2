/**
 * Supabase Books Test
 * Tests fetching books to identify the 400 error
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://fcwlovxpywymzirmzoql.supabase.co';
const supabaseKey = 'sb_publishable_sSG3_Ru-PlBft3ReptnN7g_Ar2AMGYI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testBooks() {
  console.log('='.repeat(60));
  console.log('Supabase Books Test');
  console.log('='.repeat(60));

  // Test 1: Simple select
  console.log('\n[1] Testing simple SELECT * FROM books...');
  try {
    const { data, error } = await supabase
      .from('books')
      .select('*');

    if (error) {
      console.log('❌ Error:', error.message);
      console.log('   Code:', error.code);
      console.log('   Details:', error.details);
      console.log('   Hint:', error.hint);
    } else {
      console.log('✅ Success! Rows:', data.length);
      if (data.length > 0) {
        console.log('   First row keys:', Object.keys(data[0]));
      }
    }
  } catch (err) {
    console.log('❌ Exception:', err.message);
  }

  // Test 2: Select with order
  console.log('\n[2] Testing SELECT with ORDER BY...');
  try {
    const { data, error } = await supabase
      .from('books')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.log('❌ Error:', error.message);
      console.log('   Code:', error.code);
      console.log('   Details:', error.details);
    } else {
      console.log('✅ Success! Rows:', data.length);
    }
  } catch (err) {
    console.log('❌ Exception:', err.message);
  }

  // Test 3: Select specific columns
  console.log('\n[3] Testing SELECT with specific columns...');
  try {
    const { data, error } = await supabase
      .from('books')
      .select('id, title, author');

    if (error) {
      console.log('❌ Error:', error.message);
      console.log('   Code:', error.code);
    } else {
      console.log('✅ Success! Rows:', data.length);
    }
  } catch (err) {
    console.log('❌ Exception:', err.message);
  }

  // Test 4: Check table structure
  console.log('\n[4] Checking table columns...');
  try {
    const { data, error } = await supabase
      .rpc('get_table_columns', { table_name: 'books' });

    if (error) {
      console.log('ℹ️ Cannot query columns directly');
    } else {
      console.log('Columns:', data);
    }
  } catch (err) {
    console.log('ℹ️ Cannot query columns directly');
  }

  // Test 5: Try inserting a book
  console.log('\n[5] Testing INSERT a book...');
  try {
    const { data, error } = await supabase
      .from('books')
      .insert({
        title: 'Test Book',
        author: 'Test Author',
        category: 'تست',
        chapters: [],
      })
      .select();

    if (error) {
      console.log('❌ Insert Error:', error.message);
      console.log('   Code:', error.code);
      console.log('   Details:', error.details);
    } else {
      console.log('✅ Insert Success!');
      console.log('   Data:', data);
      // Clean up
      if (data && data[0]) {
        await supabase.from('books').delete().eq('id', data[0].id);
      }
    }
  } catch (err) {
    console.log('❌ Exception:', err.message);
  }

  console.log('\n' + '='.repeat(60));
  console.log('Test Complete');
  console.log('='.repeat(60));
}

testBooks();
