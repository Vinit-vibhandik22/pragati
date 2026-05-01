const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkStatus() {
  const { data, error } = await supabase
    .from('farmer_applications')
    .select('status');

  if (error) {
    console.error(error);
    return;
  }

  const counts = data.reduce((acc, curr) => {
    acc[curr.status] = (acc[curr.status] || 0) + 1;
    return acc;
  }, {});

  console.log('Application Counts by Status:');
  console.log(JSON.stringify(counts, null, 2));
}

checkStatus();
