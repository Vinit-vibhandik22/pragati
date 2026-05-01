import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase admin client to bypass RLS for server-side batch processing
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  }
});

// Realistic bilingual discrepancies for the MahaDBT context
const DISCREPANCY_REASONS = [
  "Name mismatch between Aadhaar and 7/12 extract (Spelling variation detected). / आधार आणि ७/१२ उताऱ्यामध्ये नावात तफावत.",
  "Area mismatch: 8A holding shows lower area than claimed. / ८अ उताऱ्यानुसार क्षेत्र कमी आहे.",
  "Bank IFSC code inactive or branch merged. Needs manual verification. / बँक IFSC कोड चुकीचा आहे.",
  "Document scan blurry or unreadable. OCR confidence below threshold (42%). / दस्तऐवज स्कॅन अस्पष्ट आहे.",
  "Joint ownership detected without NOC/consent signature on 7/12. / ७/१२ वर संयुक्त मालकी पण संमतीपत्र नाही."
];

async function runAIBatch() {
  try {
    // 1. Fetch pending applications
    const { data: pendingApps, error: fetchError } = await supabaseAdmin
      .from('farmer_applications')
      .select('*')
      .eq('status', 'Pending');

    if (fetchError) {
      throw new Error(`Database fetch error: ${fetchError.message}`);
    }

    if (!pendingApps || pendingApps.length === 0) {
      return NextResponse.json({ message: "No pending applications found." }, { status: 200 });
    }

    let routedToOfficer = 0;
    let routedToClerk = 0;
    
    // 2. Simulate AI Processing & Prepare batch updates
    const updates = pendingApps.map((app) => {
      // 70% chance of passing AI verification perfectly (Realistic AI behavior)
      const isPerfectMatch = Math.random() > 0.3;

      if (isPerfectMatch) {
        routedToOfficer++;
        return {
          id: app.id,
          scheme_id: app.scheme_id, 
          scheme_name: app.scheme_name, // Include required fields for successful upsert
          status: 'Verified_by_AI',
          discrepancy_reason: null,
          is_manually_overridden: false
        };
      } else {
        routedToClerk++;
        // Pick a random realistic reason
        const randomReason = DISCREPANCY_REASONS[Math.floor(Math.random() * DISCREPANCY_REASONS.length)];
        return {
          id: app.id,
          scheme_id: app.scheme_id, 
          scheme_name: app.scheme_name, // Include required fields for successful upsert
          status: 'Action_Required',
          discrepancy_reason: randomReason,
          is_manually_overridden: false
        };
      }
    });

    // 3. Perform Bulk Upsert
    // Upsert with ID acts as an efficient bulk update for existing records
    const { error: updateError } = await supabaseAdmin
      .from('farmer_applications')
      .upsert(updates, { onConflict: 'id' });

    if (updateError) {
      throw new Error(`Database update error: ${updateError.message}`);
    }

    return NextResponse.json({
      message: "AI Batch Processing Complete",
      processed_count: updates.length,
      routed_to_officer: routedToOfficer,
      routed_to_clerk: routedToClerk,
      timestamp: new Date().toISOString()
    }, { status: 200 });

  } catch (error: any) {
    console.error("AI Batch Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Export Handlers
export async function GET() {
  return runAIBatch();
}

export async function POST() {
  return runAIBatch();
}
