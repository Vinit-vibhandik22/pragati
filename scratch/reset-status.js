const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function resetStatus() {
  const appId = 'aed478dc-5889-4523-9b84-e7aff2c7a30d';
  console.log(`Resetting status for application: ${appId} to 'Pending'...`);

  const { data, error } = await supabase
    .from('farmer_applications')
    .update({ 
      status: 'Pending',
      discrepancy_reason: null 
    })
    .eq('id', appId)
    .select();

  if (error) {
    console.error("Error updating status:", error.message);
  } else {
    console.log("Success! Application status reset to 'Pending'.");
    console.log("Updated Row:", data[0]);
  }
}

resetStatus();
