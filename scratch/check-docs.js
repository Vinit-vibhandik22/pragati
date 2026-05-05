
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function checkDocuments() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  console.log('--- Checking Storage Buckets ---');
  const { data: buckets, error: bError } = await supabase.storage.listBuckets();
  if (bError) console.error('Error listing buckets:', bError);
  else console.log('Buckets:', buckets.map(b => b.name));

  console.log('\n--- Checking Files in "documents" bucket ---');
  const { data: files, error: fError } = await supabase.storage.from('documents').list();
  if (fError) console.error('Error listing files:', fError);
  else {
    console.log(`Found ${files.length} files:`);
    files.forEach(f => console.log(` - ${f.name} (${f.metadata?.size} bytes)`));
  }

  console.log('\n--- Checking Applications Table ---');
  const { data: apps, error: aError } = await supabase.from('applications').select('app_id, farmer_name, file_url, status');
  if (aError) console.error('Error fetching applications:', aError);
  else {
    console.log(`Found ${apps.length} applications:`);
    apps.forEach(a => console.log(` - [${a.app_id}] ${a.farmer_name}: ${a.file_url ? 'Has File' : 'No File'} (${a.status})`));
  }
}

checkDocuments();
