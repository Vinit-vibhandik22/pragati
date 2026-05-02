import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Standalone seed route for hackathon demo - Seeding both demo tables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

const MOCK_DATA = [
  // 5 PENDING (For AI Batch Processor)
  { name: "Tukaram Patil", aadhaar: "4532 8876 1234", dist: "Kolhapur", taluka: "Karveer", village: "Kagal", area: 2.4, status: "Pending", appStatus: "pending" },
  { name: "Savitri Deshmukh", aadhaar: "9921 4456 7781", dist: "Pune", taluka: "Haveli", village: "Loni", area: 1.8, status: "Pending", appStatus: "pending" },
  { name: "Vitthal Rao", aadhaar: "3342 1100 9982", dist: "Solapur", taluka: "Pandharpur", village: "Wakhari", area: 3.2, status: "Pending", appStatus: "pending" },
  { name: "Ananda Shinde", aadhaar: "6671 2234 5543", dist: "Satara", taluka: "Karad", village: "Umbraj", area: 0.9, status: "Pending", appStatus: "pending" },
  { name: "Gajanan Mane", aadhaar: "8890 1122 3344", dist: "Sangli", taluka: "Miraj", village: "Tasgaon", area: 4.5, status: "Pending", appStatus: "pending" },

  // 5 ACTION_REQUIRED (For Clerk Exception Queue)
  { 
    name: "Sunita Kadam", aadhaar: "1234 5678 9012", dist: "Pune", taluka: "Maval", village: "Lonavala", area: 1.5, status: "Action_Required", appStatus: "held",
    reason: "Name mismatch: 'Sunita' in Aadhaar vs 'Sunitabai' in 7/12 extract. / आधार आणि ७/१२ उताऱ्यामध्ये नावात तफावत."
  },
  { 
    name: "Ramesh Pawar", aadhaar: "9876 5432 1098", dist: "Nashik", taluka: "Niphad", village: "Ozar", area: 2.1, status: "Action_Required", appStatus: "held",
    reason: "Document scan blurry. AI OCR confidence 38%. Needs manual review. / दस्तऐवज स्कॅन अस्पष्ट आहे."
  },
  { 
    name: "Eknath Shinde", aadhaar: "5566 7788 9900", dist: "Thane", taluka: "Kalyan", village: "Dombivli", area: 5.2, status: "Action_Required", appStatus: "held",
    reason: "Joint ownership detected without NOC on 7/12. / ७/१२ वर संयुक्त मालकी पण संमतीपत्र नाही."
  },
  { 
    name: "Meera Gaikwad", aadhaar: "1122 3344 5566", dist: "Aurangabad", taluka: "Paithan", village: "Bidkin", area: 1.2, status: "Action_Required", appStatus: "held",
    reason: "Area mismatch: 8A holding shows 0.8ha but claimed 1.2ha. / ८अ उताऱ्यानुसार क्षेत्र कमी आहे."
  },
  { 
    name: "Baburao Ganpat", aadhaar: "4455 6677 8899", dist: "Nagpur", taluka: "Ramtek", village: "Mansar", area: 2.8, status: "Action_Required", appStatus: "held",
    reason: "Bank IFSC code inactive. Needs verification of passbook. / बँक IFSC कोड चुकीचा आहे."
  },

  // 5 VERIFIED_BY_CLERK (For Officer Dashboard)
  { name: "Dilip Vengsarkar", aadhaar: "1010 2020 3030", dist: "Mumbai", taluka: "Andheri", village: "Marol", area: 0.5, status: "Verified_by_Clerk", appStatus: "approved" },
  { name: "Sachin Tendulkar", aadhaar: "1111 2222 3333", dist: "Ratnagiri", taluka: "Dapoli", village: "Velas", area: 2.0, status: "Verified_by_Clerk", appStatus: "approved" },
  { name: "Sharad Pawar", aadhaar: "2222 3333 4444", dist: "Baramati", taluka: "Baramati", village: "Katewadi", area: 10.5, status: "Verified_by_Clerk", appStatus: "approved" },
  { name: "Nitin Gadkari", aadhaar: "3333 4444 5555", dist: "Nagpur", taluka: "Nagpur Urban", village: "Wardha Rd", area: 4.2, status: "Verified_by_Clerk", appStatus: "approved" },
  { name: "Ajit Dada", aadhaar: "4444 5555 6666", dist: "Pune", taluka: "Indapur", village: "Baramati", area: 6.8, status: "Verified_by_Clerk", appStatus: "approved" },
];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');

  if (secret !== 'pragati2026') {
    return NextResponse.json({ error: "Unauthorized: Invalid secret token" }, { status: 401 });
  }

  try {
    // 1. Prepare data for farmer_applications (Demo Table)
    const farmerApps = MOCK_DATA.map(m => ({
      farmer_id: `FARMER_${m.name.replace(/\s+/g, '_').toUpperCase()}_${m.aadhaar.slice(-4)}`,
      scheme_id: 'SCH_PRAGATI_001',
      scheme_name: 'Namo Shetkari Mahasanman Nidhi',
      status: m.status,
      discrepancy_reason: m.reason || null,
      is_manually_overridden: false,
      document_urls: [],
      created_at: new Date(Date.now() - Math.floor(Math.random() * 1000000000)).toISOString(),
    }));

    // 2. Prepare data for applications (Core Table)
    const apps = MOCK_DATA.map(m => ({
      app_id: `APP_${m.name.replace(/\s+/g, '').toUpperCase().slice(0, 4)}_${m.aadhaar.slice(-4)}`,
      farmer_name: m.name,
      aadhaar_last4: m.aadhaar.slice(-4),
      village: m.village,
      taluka: m.taluka,
      district: m.dist,
      document_type: 'subsidy_application',
      scheme_name: 'Namo Shetkari Mahasanman Nidhi',
      claimed_amount: Math.floor(m.area * 5000), // Simulated amount based on area
      risk_score: m.status === 'Action_Required' ? 'HIGH' : 'LOW',
      status: m.appStatus,
      department: 'Agriculture',
      submitted_at: new Date(Date.now() - Math.floor(Math.random() * 1000000000)).toISOString(),
      updated_at: new Date().toISOString(),
    }));

    // 3. Clear existing for fresh start
    await supabaseAdmin.from('farmer_applications').delete().neq('id', '0');
    await supabaseAdmin.from('applications').delete().neq('id', '0');

    // 4. Batch Insert
    const [farmerRes, appRes] = await Promise.all([
      supabaseAdmin.from('farmer_applications').insert(farmerApps).select(),
      supabaseAdmin.from('applications').insert(apps).select()
    ]);

    if (farmerRes.error) throw farmerRes.error;
    if (appRes.error) throw appRes.error;

    return NextResponse.json({
      success: true,
      message: `Successfully seeded 15 records into both 'farmer_applications' and 'applications' tables.`,
      farmer_applications_count: farmerRes.data.length,
      applications_count: appRes.data.length
    }, { status: 200 });

  } catch (error: any) {
    console.error("Seeding Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
