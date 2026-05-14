CREATE TABLE IF NOT EXISTS farmer_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  farmer_id VARCHAR(12) UNIQUE NOT NULL,
  farmer_name VARCHAR(255) NOT NULL,
  aadhaar_number VARCHAR(12) UNIQUE NOT NULL,
  phone VARCHAR(15),
  documents JSONB DEFAULT '{}'::jsonb,
  profile_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Turn on Row Level Security
ALTER TABLE farmer_profiles ENABLE ROW LEVEL SECURITY;

-- Allow open access for demo purposes
CREATE POLICY "Allow public read access" ON farmer_profiles
  FOR SELECT USING (true);

CREATE POLICY "Allow public insert access" ON farmer_profiles
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update access" ON farmer_profiles
  FOR UPDATE USING (true);
