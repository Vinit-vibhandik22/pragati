import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixPolicies() {
  console.log('🛡️ Attempting to set Storage Policies for "schemes" bucket...');

  // Since we can't easily run arbitrary SQL via the client without an RPC,
  // we will print the SQL for the user and try one more thing: 
  // Ensure the bucket is public (which we already did).
  
  const { data, error } = await supabase.storage.getBucket('schemes');
  
  if (error) {
    console.log('Creating bucket as it seems missing...');
    await supabase.storage.createBucket('schemes', { public: true });
  } else {
    console.log('✅ Bucket "schemes" exists.');
  }

  console.log('\n⚠️  IMPORTANT: MANUAL ACTION REQUIRED  ⚠️');
  console.log('The "Row-Level Security (RLS)" policy error occurs because the bucket needs permissions.');
  console.log('Please copy and paste the following SQL into your Supabase SQL Editor:');
  console.log(`
------------------------------------------------------------
-- 1. ALLOW PUBLIC UPLOAD TO "schemes" BUCKET
------------------------------------------------------------
insert into storage.policies (name, color, bucket_id, definition, action, role)
values ('Public Upload', '#ff0000', 'schemes', '(true)', 'INSERT', 'anon');

------------------------------------------------------------
-- 2. ALLOW PUBLIC VIEWING FROM "schemes" BUCKET
------------------------------------------------------------
insert into storage.policies (name, color, bucket_id, definition, action, role)
values ('Public View', '#00ff00', 'schemes', '(true)', 'SELECT', 'anon');
------------------------------------------------------------
  `);

  console.log('\nOnce you run the SQL above, the "new row violates row-level security policy" error will disappear.');
}

fixPolicies().catch(console.error);
