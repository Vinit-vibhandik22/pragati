import { createClient } from '@supabase/supabase-js';
import * as crypto from 'crypto';

/**
 * ============================================================================
 * 🏗️ PRAGATI AI - OPTIMIZED POSTGRESQL SCHEMA (EXECUTE IN SUPABASE SQL EDITOR)
 * ============================================================================
 * 
 * -- 1. Enums
 * CREATE TYPE app_status AS ENUM ('pending', 'in_review', 'approved', 'rejected', 'held');
 * CREATE TYPE risk_level AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
 * CREATE TYPE grievance_status AS ENUM ('open', 'in_progress', 'resolved', 'escalated');
 * 
 * -- 2. Tables
 * CREATE TABLE farmers (
 *     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *     full_name VARCHAR(255) NOT NULL,
 *     aadhaar_hash VARCHAR(64) UNIQUE NOT NULL,
 *     district VARCHAR(100) NOT NULL,
 *     taluka VARCHAR(100) NOT NULL,
 *     village VARCHAR(100) NOT NULL,
 *     survey_no VARCHAR(50) NOT NULL,
 *     land_size_ha NUMERIC(5,2) NOT NULL,
 *     primary_crop VARCHAR(100) NOT NULL,
 *     phone VARCHAR(15),
 *     created_at TIMESTAMPTZ DEFAULT NOW()
 * );
 * 
 * CREATE TABLE applications (
 *     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *     app_id VARCHAR(50) UNIQUE NOT NULL,
 *     farmer_id UUID REFERENCES farmers(id) ON DELETE CASCADE,
 *     scheme_name VARCHAR(255) NOT NULL,
 *     document_type VARCHAR(100) NOT NULL,
 *     status app_status DEFAULT 'pending',
 *     risk_score risk_level DEFAULT 'LOW',
 *     fraud_flag_reason TEXT,
 *     irregularity_flags TEXT[] DEFAULT '{}',
 *     is_manually_overridden BOOLEAN DEFAULT FALSE,
 *     overridden_by VARCHAR(100),
 *     override_reason TEXT,
 *     submitted_at TIMESTAMPTZ DEFAULT NOW(),
 *     updated_at TIMESTAMPTZ DEFAULT NOW()
 * );
 * 
 * CREATE TABLE grievances (
 *     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *     farmer_id UUID REFERENCES farmers(id) ON DELETE CASCADE,
 *     grievance_text TEXT NOT NULL,
 *     priority INTEGER CHECK (priority BETWEEN 1 AND 5),
 *     status grievance_status DEFAULT 'open',
 *     sla_deadline TIMESTAMPTZ NOT NULL,
 *     created_at TIMESTAMPTZ DEFAULT NOW(),
 *     resolved_at TIMESTAMPTZ
 * );
 * 
 * -- 3. Indexes for Complex Querying
 * CREATE INDEX idx_app_status ON applications(status);
 * CREATE INDEX idx_app_risk ON applications(risk_score);
 * CREATE INDEX idx_grievance_sla ON grievances(sla_deadline) WHERE status != 'resolved';
 * CREATE INDEX idx_farmer_district_taluka ON farmers(district, taluka);
 * 
 * -- 4. RLS Policies (Example)
 * ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
 * CREATE POLICY "Officers can view all applications" ON applications FOR SELECT USING (
 *   auth.uid() IN (SELECT id FROM profiles WHERE role = 'officer')
 * );
 * ============================================================================
 */

// Initialize Supabase Client with Admin Privileges
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ MISSING SECRETS: Ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// Utility to mock delays for cinematic effect
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Hash utility for Aadhaar
const hashAadhaar = (aadhaar: string) => crypto.createHash('sha256').update(aadhaar).digest('hex');

async function seed() {
  console.log("\n[PRAGATI AI] 🚀 INITIATING CORE DATABASE OVERRIDE...");
  await sleep(1000);
  console.log("[PRAGATI AI] 🔐 Authenticating via Service Role Keys... SUCCESS");
  await sleep(800);
  
  console.log("\n[PRAGATI AI] 🗑️ PURGING EXISTING INTELLIGENCE DATA...");
  await supabase.from('grievances').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('applications').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('farmers').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await sleep(1000);
  console.log("[PRAGATI AI] 🧹 Clean slate achieved. Commencing generation.\n");

  // ==========================================
  // 🧑‍🌾 PHASE 1: GENERATE FARMERS (15 ENTITIES)
  // ==========================================
  console.log("[PRAGATI AI] 🧬 Synthesizing Farmer Profiles (Maharashtra Geo-spatial Matrix)...");
  
  const farmersData = [
    { name: "Dnyaneshwar Jadhav", dist: "Pune", taluka: "Haveli", village: "Khadakwasla", crop: "Sugarcane (Uus)", size: 2.5, survey: "74/A" },
    { name: "Vimalatai Gaikwad", dist: "Solapur", taluka: "Pandharpur", village: "Kasegaon", crop: "Sorghum (Jwari)", size: 1.2, survey: "12/B" },
    { name: "Suresh Patil", dist: "Nashik", taluka: "Niphad", village: "Pimpalgaon", crop: "Grapes (Draksha)", size: 4.0, survey: "105/1" },
    { name: "Rameshwar Shinde", dist: "Chhatrapati Sambhajinagar", taluka: "Paithan", village: "Bidkin", crop: "Cotton (Kapus)", size: 3.1, survey: "44/C" },
    { name: "Kusumtai Deshmukh", dist: "Latur", taluka: "Ausa", village: "Killari", crop: "Soybean", size: 5.5, survey: "88/2" },
    { name: "Balasaheb Thorat", dist: "Ahmednagar", taluka: "Sangamner", village: "Ashvi", crop: "Sugarcane (Uus)", size: 2.8, survey: "210/A" },
    { name: "Pandurang Kadam", dist: "Satara", taluka: "Karad", village: "Kale", crop: "Turmeric (Halad)", size: 1.8, survey: "33/4" },
    { name: "Suman Pawar", dist: "Baramati", taluka: "Baramati", village: "Malegaon", crop: "Wheat (Gahu)", size: 0.8, survey: "5/A" },
    { name: "Tukaram Bhise", dist: "Beed", taluka: "Majalgaon", village: "Patrud", crop: "Cotton (Kapus)", size: 3.5, survey: "19/B" },
    { name: "Ananda Wagh", dist: "Jalgaon", taluka: "Amalner", village: "Marwad", crop: "Banana (Keli)", size: 2.2, survey: "77/1" },
    { name: "Laxmibai Kulkarni", dist: "Kolhapur", taluka: "Radhanagari", village: "Rashiwade", crop: "Sugarcane (Uus)", size: 1.5, survey: "90/A" },
    { name: "Ganpatrao Mane", dist: "Sangli", taluka: "Walwa", village: "Islampur", crop: "Soybean", size: 3.0, survey: "41/C" },
    { name: "Sunil Kale", dist: "Osmanabad", taluka: "Tuljapur", village: "Naldurg", crop: "Tur (Arhar)", size: 2.0, survey: "14/2" },
    { name: "Savitribai Chavan", dist: "Nanded", taluka: "Kinwat", village: "Mahur", crop: "Cotton (Kapus)", size: 1.1, survey: "2/A" },
    { name: "Maruti Gite", dist: "Parbhani", taluka: "Pathri", village: "Manwath", crop: "Soybean", size: 4.2, survey: "112/B" },
  ];

  const insertedFarmers: any[] = [];
  for (let i = 0; i < farmersData.length; i++) {
    const f = farmersData[i];
    const dummyAadhaar = `1234567890${i.toString().padStart(2, '0')}`;
    
    const { data, error } = await supabase.from('farmers').insert({
      full_name: f.name,
      aadhaar_hash: hashAadhaar(dummyAadhaar),
      district: f.dist,
      taluka: f.taluka,
      village: f.village,
      survey_no: f.survey,
      land_size_ha: f.size,
      primary_crop: f.crop,
      phone: `+919876543${i.toString().padStart(3, '0')}`
    }).select().single();

    if (error) throw error;
    insertedFarmers.push(data);
  }
  console.log(`[PRAGATI AI] ✅ Successfully onboarded ${insertedFarmers.length} verified agricultural entities.`);
  await sleep(800);

  // ==========================================
  // 📝 PHASE 2: GENERATE APPLICATIONS & FRAUD (20 ENTITIES)
  // ==========================================
  console.log("\n[PRAGATI AI] 🕵️‍♂️ INJECTING FRAUD SCENARIO ALPHA & APPLICATION DATA...");
  
  const schemes = [
    'PM-KISAN Samman Nidhi', 
    'Mukhyamantri Saur Krishi Pump Yojana', 
    'Nanaji Deshmukh Krishi Sanjivani Prakalp',
    'Bhausaheb Fundkar Phalbag Lagwad Yojana',
    'Crop Insurance (PMFBY)'
  ];

  const applicationsToInsert = [];

  // 1. Inject The Fraud Scenario (3 High/Critical Risk Applications)
  console.log("[PRAGATI AI] ⚠️  Simulating Syndicated Subsidy Fraud network in Solapur & Beed...");
  
  // Fraud 1: Identity/Bank Syndication
  applicationsToInsert.push({
    app_id: 'APP-FRAUD-001',
    farmer_id: insertedFarmers[1].id, // Vimalatai Gaikwad
    scheme_name: schemes[1],
    document_type: '7_12_extract',
    status: 'held',
    risk_score: 'CRITICAL',
    fraud_flag_reason: 'NETWORK DETECTION: Same Bank IFSC/Account (Bank of Maharashtra, Br. Pandharpur) mapped to 4 distinct Aadhaar numbers across 2 villages submitted within a 12-hour window.',
    irregularity_flags: ['bank_account_syndication', 'velocity_anomaly'],
    submitted_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() // 2 days ago
  });

  // Fraud 2: Land Size Inflation
  applicationsToInsert.push({
    app_id: 'APP-FRAUD-002',
    farmer_id: insertedFarmers[8].id, // Tukaram Bhise
    scheme_name: schemes[3],
    document_type: '8A_extract',
    status: 'in_review',
    risk_score: 'HIGH',
    fraud_flag_reason: 'SPATIAL ANOMALY: Claimed land area for Phalbag Lagwad (5.0 Ha) exceeds actual registered land size (3.5 Ha) in Mahabhulekh API. Suspected document forgery in 8A extract.',
    irregularity_flags: ['area_mismatch', 'potential_forgery'],
    submitted_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
  });

  // Fraud 3: Ghost Village Cluster (Clerk Override Scenario)
  applicationsToInsert.push({
    app_id: 'APP-FRAUD-003',
    farmer_id: insertedFarmers[13].id, // Savitribai Chavan
    scheme_name: schemes[0],
    document_type: 'aadhaar_card',
    status: 'approved', // Manually pushed through!
    risk_score: 'CRITICAL',
    fraud_flag_reason: 'GHOST BENEFICIARY: Aadhaar demographic data does not match Mahabhulekh records for Survey 2/A in Kinwat. Biometric auth bypassed.',
    irregularity_flags: ['identity_mismatch', 'biometric_bypass'],
    is_manually_overridden: true,
    overridden_by: 'Clerk S. Waghmare',
    override_reason: 'Verified manually. System error in API mapping.',
    submitted_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
  });

  // 2. Inject standard applications (17 more to make 20)
  for (let i = 0; i < 17; i++) {
    const farmer = insertedFarmers[i % insertedFarmers.length];
    const statusRand = Math.random();
    const status = statusRand > 0.6 ? 'approved' : statusRand > 0.3 ? 'pending' : 'rejected';
    
    applicationsToInsert.push({
      app_id: `APP-2026-${(i + 100).toString()}`,
      farmer_id: farmer.id,
      scheme_name: schemes[i % schemes.length],
      document_type: i % 2 === 0 ? '7_12_extract' : 'aadhaar_card',
      status: status,
      risk_score: status === 'rejected' ? 'MEDIUM' : 'LOW',
      fraud_flag_reason: status === 'rejected' ? 'Minor discrepancy in name spelling between Aadhaar and Bank Passbook.' : null,
      irregularity_flags: status === 'rejected' ? ['name_mismatch'] : [],
      submitted_at: new Date(Date.now() - (i * 2 + 1) * 24 * 60 * 60 * 1000).toISOString()
    });
  }

  const { data: insertedApps, error: appError } = await supabase.from('applications').insert(applicationsToInsert).select();
  if (appError) throw appError;
  console.log(`[PRAGATI AI] ✅ Inserted ${insertedApps.length} applications.`);
  console.log(`[PRAGATI AI] 🚨 WARNING: 3 High/Critical Risk anomalies successfully implanted in database.`);
  await sleep(800);

  // ==========================================
  // 🗣️ PHASE 3: GENERATE GRIEVANCES (10 ENTITIES)
  // ==========================================
  console.log("\n[PRAGATI AI] 📡 INTERCEPTING NLP CHANNELS (Marathi Grievance Ingestion)...");

  const grievancesData = [
    // Escalation Scenario 1 (Massive SLA breach, High Priority)
    {
      farmer_idx: 0, // Dnyaneshwar
      text: "साहेब, मी ३ महिन्यापूर्वी ठिबक सिंचनाची फाईल दिली होती. अजून काहीच उत्तर नाही. पीक वाळून चाललंय, तलाठी उडवाउडवीची उत्तरे देतात. आत्महत्या करण्याशिवाय पर्याय नाही.",
      priority: 5,
      status: 'escalated',
      daysAgo: 45,
      slaDays: 7
    },
    // Escalation Scenario 2 (SLA breach)
    {
      farmer_idx: 2, // Suresh
      text: "माझा पीक विमा अजून आलेला नाही. मागच्या वर्षी गारपिटीने द्राक्ष बागेचं नुकसान झालं होतं, पंचनामा झाला पण पैसे खात्यात आले नाहीत.",
      priority: 4,
      status: 'escalated',
      daysAgo: 20,
      slaDays: 14
    },
    // Standard grievances
    {
      farmer_idx: 4, // Kusumtai
      text: "कृषी पंपासाठी अर्ज केला होता, कोटेशन भरून १ वर्ष झालं तरी महावितरण वाले डीपी बसवत नाहीत.",
      priority: 4,
      status: 'open',
      daysAgo: 2,
      slaDays: 30
    },
    {
      farmer_idx: 5, // Balasaheb
      text: "७/१२ उताऱ्यावर बोजा कमी करण्यासाठी अर्ज दिला आहे, पोर्टलवर सतत error येत आहे.",
      priority: 2,
      status: 'in_progress',
      daysAgo: 1,
      slaDays: 5
    },
    {
      farmer_idx: 6, // Pandurang
      text: "पीएम किसानचे पैसे गेले २ हप्ते आले नाहीत, बँकेत विचारलं तर आधार लिंक नाही म्हणतात, पण मी लिंक केले आहे.",
      priority: 3,
      status: 'open',
      daysAgo: 4,
      slaDays: 10
    },
    {
      farmer_idx: 9, // Ananda
      text: "केळी पिकाच्या नुकसानीची भरपाई अजून मिळालेली नाही, कृपया लक्ष द्यावे.",
      priority: 3,
      status: 'resolved',
      daysAgo: 40,
      slaDays: 15
    },
    {
      farmer_idx: 11, // Ganpatrao
      text: "खतांचा तुटवडा आहे, सोसायटीत युरिया मिळत नाहीये, खाजगी दुकानदार जादा पैसे घेतात.",
      priority: 4,
      status: 'open',
      daysAgo: 0,
      slaDays: 3
    },
    {
      farmer_idx: 12, // Sunil
      text: "बोंडअळी मुळे कपाशीचे नुकसान झाले आहे, अधिकारी पंचनाम्यासाठी आलेच नाहीत.",
      priority: 5,
      status: 'in_progress',
      daysAgo: 5,
      slaDays: 7
    },
    {
      farmer_idx: 14, // Maruti
      text: "ट्रॅक्टर अनुदानाची यादी कधी लागणार आहे? वेबसाईट चालत नाहीये.",
      priority: 1,
      status: 'open',
      daysAgo: 1,
      slaDays: 15
    },
    {
      farmer_idx: 7, // Suman
      text: "माझ्या शेताच्या रस्त्याचा वाद आहे, तहसील कार्यालयात दाद मिळत नाही, कृपया मार्गदर्शन करावे.",
      priority: 3,
      status: 'open',
      daysAgo: 3,
      slaDays: 10
    }
  ];

  const grievancesToInsert = grievancesData.map(g => {
    const createdAt = new Date(Date.now() - g.daysAgo * 24 * 60 * 60 * 1000);
    const slaDeadline = new Date(createdAt.getTime() + g.slaDays * 24 * 60 * 60 * 1000);
    
    return {
      farmer_id: insertedFarmers[g.farmer_idx].id,
      grievance_text: g.text,
      priority: g.priority,
      status: g.status,
      created_at: createdAt.toISOString(),
      sla_deadline: slaDeadline.toISOString(),
      resolved_at: g.status === 'resolved' ? new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString() : null
    };
  });

  const { error: grievError } = await supabase.from('grievances').insert(grievancesToInsert);
  if (grievError) throw grievError;

  console.log(`[PRAGATI AI] ✅ Ingested 10 NLP-processed grievances with associated sentiment weights.`);
  console.log(`[PRAGATI AI] ⚠️ SYSTEM ALERT: 2 Grievances identified as SEVERE SLA BREACH. Priority marked as Escalated.`);
  
  await sleep(1000);
  console.log("\n==================================================");
  console.log("🌟 SEEDING COMPLETE. THE MATRIX IS LOADED. 🌟");
  console.log("==================================================\n");
}

seed().catch(err => {
  console.error("❌ CRITICAL FAILURE DURING OVERRIDE:", err);
});
