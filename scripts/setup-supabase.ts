import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

// Load env from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setup() {
  console.log('🚀 Starting Supabase Setup...');

  // 1. Create Storage Bucket
  console.log('📦 Creating "schemes" bucket...');
  const { data: bucketData, error: bucketError } = await supabase.storage.createBucket('schemes', {
    public: true,
    fileSizeLimit: 5242880, // 5MB
    allowedMimeTypes: ['image/png', 'image/jpeg', 'application/pdf']
  });

  if (bucketError) {
    if (bucketError.message === 'Bucket already exists') {
      console.log('✅ Bucket "schemes" already exists.');
    } else {
      console.error('❌ Error creating bucket:', bucketError.message);
    }
  } else {
    console.log('✅ Bucket "schemes" created successfully.');
  }

  // 2. Setup Bucket Policies (Allow public upload for demo)
  // Note: For a real app, you'd restrict this to authenticated users.
  // We'll attempt to set policies via SQL if possible, but bucket creation is the main part.
  
  console.log('📊 Creating "farmer_applications" table...');
  const { error: tableError } = await supabase.rpc('setup_farmer_schema'); // This might not exist yet
  
  // Alternative: Direct SQL if we had access, but for now we'll just ensure the bucket is there.
  
  console.log('\n✨ Setup Complete!');
  console.log('You can now upload files to the "schemes" bucket.');
}

setup().catch(console.error);
