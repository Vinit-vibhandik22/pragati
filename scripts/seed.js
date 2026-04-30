/**
 * PRAGATI AI — Demo Seed Script
 * 
 * Usage: node scripts/seed.js
 * Requires: .env.local with NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
 * 
 * Creates:
 * - 2 demo auth users (clerk + officer) with profiles
 * - 20 realistic applications (varied statuses, 3 HIGH risk)
 * - 10 grievances (2 overdue, 1 escalated, varied priorities)
 * - 3 distress scores (CRITICAL, HIGH, HIGH)
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing env vars. Copy .env.local.example to .env.local and fill in values.')
  process.exit(1)
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Realistic Maharashtra farmer names
const FARMERS = [
  'Ramesh Baburao Patil', 'Suresh Dattatray Deshmukh', 'Vikas Ganesh Shinde',
  'Anil Shankar More', 'Pravin Rajendra Jadhav', 'Deepak Vishnu Pawar',
  'Sanjay Ramdas Kale', 'Ganesh Pandurang Thorat', 'Rajesh Namdev Bhosale',
  'Ashok Balasaheb Gaikwad', 'Vijay Keshav Nikam', 'Manoj Shivaji Mane',
  'Sachin Hanumant Kadam', 'Nitin Eknath Chavan', 'Rahul Dnyandeo Salunke',
  'Santosh Madhav Sonawane', 'Dnyaneshwar Tukaram Wagh', 'Yogesh Anant Lokhande',
  'Amol Vitthal Deshpande', 'Prashant Ramchandra Kulkarni',
]

const VILLAGES = [
  'Shirur', 'Khed', 'Haveli', 'Baramati', 'Indapur', 'Daund',
  'Junnar', 'Ambegaon', 'Maval', 'Mulshi', 'Purandar', 'Bhor',
]

const TALUKAS = [
  'Shirur', 'Khed', 'Haveli', 'Baramati', 'Indapur', 'Daund',
]

async function createDemoUsers() {
  console.log('Creating demo users...')

  // Create clerk user
  const { data: clerkAuth, error: clerkErr } = await supabase.auth.admin.createUser({
    email: 'clerk@pragati.demo',
    password: 'clerk123',
    email_confirm: true,
    user_metadata: { full_name: 'Rajiv Kumar (Clerk)', role: 'clerk' },
  })
  if (clerkErr && !clerkErr.message.includes('already')) {
    console.error('Clerk creation error:', clerkErr.message)
  }

  // Create officer user
  const { data: officerAuth, error: officerErr } = await supabase.auth.admin.createUser({
    email: 'officer@pragati.demo',
    password: 'officer123',
    email_confirm: true,
    user_metadata: { full_name: 'Dr. Sunil Patil (TAO)', role: 'officer' },
  })
  if (officerErr && !officerErr.message.includes('already')) {
    console.error('Officer creation error:', officerErr.message)
  }

  const clerkId = clerkAuth?.user?.id
  const officerId = officerAuth?.user?.id

  console.log(`  Clerk ID: ${clerkId || 'already exists'}`)
  console.log(`  Officer ID: ${officerId || 'already exists'}`)
  console.log('  Login: clerk@pragati.demo / clerk123')
  console.log('  Login: officer@pragati.demo / officer123')

  return { clerkId, officerId }
}

async function seedApplications(clerkId) {
  console.log('Seeding applications...')

  const docTypes = ['subsidy_application', 'insurance_claim', 'scheme_enrollment', 'land_record']
  const schemes = ['PM-KISAN', 'PMFBY', 'Namo Shetkari', 'Per Drop More Crop', 'KCC', null]

  const applications = []

  for (let i = 0; i < 20; i++) {
    const farmer = FARMERS[i]
    const village = VILLAGES[i % VILLAGES.length]
    const taluka = TALUKAS[i % TALUKAS.length]
    const docType = docTypes[i % docTypes.length]
    const aadhaar = String(1000 + i + Math.floor(Math.random() * 8000)).slice(0, 4)

    let status, riskScore, irregularityFlags

    if (i === 1) {
      // HIGH risk — duplicate aadhaar
      status = 'held'
      riskScore = 'HIGH'
      irregularityFlags = [
        { type: 'duplicate_aadhaar', detail: 'Matches SUB-2026-00001 (Ramesh Baburao Patil)', severity: 'high', matched_app_id: 'SUB-2026-00001' }
      ]
    } else if (i === 5) {
      // HIGH risk — amount anomaly
      status = 'held'
      riskScore = 'HIGH'
      irregularityFlags = [
        { type: 'amount_anomaly', detail: 'Claim ₹85,000 vs district avg ₹18,000', severity: 'high' }
      ]
    } else if (i === 12) {
      // HIGH risk — village cluster + duplicate land
      status = 'held'
      riskScore = 'HIGH'
      irregularityFlags = [
        { type: 'village_cluster', detail: '14 applications from Baramati today', severity: 'medium' },
        { type: 'possible_duplicate_land_record', detail: 'Survey/Gat No 123/2 might match SUB-2026-00003', severity: 'medium', matched_app_id: 'SUB-2026-00003' },
        { type: 'duplicate_aadhaar', detail: 'Matches SUB-2026-00008', severity: 'high' }
      ]
    } else if (i % 5 === 0) {
      status = 'approved'
      riskScore = 'LOW'
      irregularityFlags = []
    } else if (i % 7 === 0) {
      status = 'rejected'
      riskScore = 'LOW'
      irregularityFlags = []
    } else if (i % 4 === 0) {
      status = 'in_review'
      riskScore = 'MEDIUM'
      irregularityFlags = [
        { type: 'village_cluster', detail: `${8 + i % 5} applications from ${village} today`, severity: 'medium' }
      ]
    } else {
      status = 'pending'
      riskScore = 'LOW'
      irregularityFlags = []
    }

    applications.push({
      app_id: `SUB-2026-${String(i + 1).padStart(5, '0')}`,
      farmer_name: farmer,
      aadhaar_last4: aadhaar,
      village,
      taluka,
      district: 'Pune',
      document_type: docType,
      scheme_name: schemes[i % schemes.length],
      claimed_amount: docType === 'subsidy_application' ? 6000 + (i * 500) : (docType === 'insurance_claim' ? 15000 + (i * 3000) : null),
      status,
      risk_score: riskScore,
      irregularity_flags: irregularityFlags,
      department: docType === 'subsidy_application' ? 'Subsidy Department' : 
                  docType === 'insurance_claim' ? 'Insurance Cell' : 
                  docType === 'scheme_enrollment' ? 'Scheme Registration' : 'Land Records',
      submitted_by: clerkId || null,
      submitted_at: new Date(Date.now() - (20 - i) * 86400000 * Math.random()).toISOString(),
    })
  }

  const { error } = await supabase.from('applications').insert(applications)
  if (error) console.error('Application seed error:', error.message)
  else console.log(`  Inserted ${applications.length} applications`)
}

async function seedGrievances(clerkId) {
  console.log('Seeding grievances...')

  const grievances = [
    {
      grievance_id: 'GRV-2026-00001',
      farmer_name: 'Vikas Ganesh Shinde',
      aadhaar_last4: '9901',
      phone: '9876543210',
      village: 'Haveli', taluka: 'Haveli', district: 'Pune',
      complaint_text: 'कार्यालयातील अधिकाऱ्याने PM KISAN अर्ज करण्यासाठी ₹500 मागितले. हे पूर्णपणे अनैतिक आहे. (Officer demanded ₹500 bribe for PM KISAN application)',
      category: 'officer_misconduct',
      priority: 5,
      priority_reason: 'Bribery allegation — requires immediate investigation',
      status: 'escalated',
      sla_days: 2,
      sla_deadline: new Date(Date.now() - 2 * 86400000).toISOString(), // Overdue by 2 days
      registered_by: clerkId || null,
    },
    {
      grievance_id: 'GRV-2026-00002',
      farmer_name: 'Ramesh Baburao Patil',
      aadhaar_last4: '4589',
      phone: '9876543211',
      village: 'Shirur', taluka: 'Shirur', district: 'Pune',
      complaint_text: 'दुष्काळामुळे संपूर्ण सोयाबीन पीक नष्ट झाले. PMFBY विमा रक्कम ३ महिन्यांपासून प्रलंबित. कुटुंब उपासमारीच्या धोक्यात. (Entire soybean crop destroyed by drought. PMFBY insurance pending 3 months. Family facing starvation)',
      category: 'crop_loss',
      priority: 5,
      priority_reason: 'Drought-induced crop loss with pending insurance — possible distress situation',
      status: 'registered',
      sla_days: 5,
      sla_deadline: new Date(Date.now() + 3 * 86400000).toISOString(),
      registered_by: clerkId || null,
    },
    {
      grievance_id: 'GRV-2026-00003',
      farmer_name: 'Anil Shankar More',
      aadhaar_last4: '3344',
      village: 'Khed', taluka: 'Khed', district: 'Pune',
      complaint_text: 'PM-KISAN 2 installments not received since 6 months despite valid application',
      category: 'subsidy_not_received',
      priority: 4,
      priority_reason: 'Financial hardship due to delayed subsidy payments',
      status: 'in_progress',
      sla_days: 7,
      sla_deadline: new Date(Date.now() - 86400000).toISOString(), // Overdue
      registered_by: clerkId || null,
    },
    {
      grievance_id: 'GRV-2026-00004',
      farmer_name: 'Deepak Vishnu Pawar',
      aadhaar_last4: '5566',
      village: 'Baramati', taluka: 'Baramati', district: 'Pune',
      complaint_text: 'विहिरीचे पाणी 2 महिन्यांपासून कमी आहे. शासनाने सिंचन पाइपलाइन मंजूर केली पण अजून काम सुरू नाही.',
      category: 'water_supply',
      priority: 3,
      status: 'registered',
      sla_days: 3,
      sla_deadline: new Date(Date.now() + 2 * 86400000).toISOString(),
      registered_by: clerkId || null,
    },
    {
      grievance_id: 'GRV-2026-00005',
      farmer_name: 'Sanjay Ramdas Kale',
      aadhaar_last4: '7788',
      village: 'Indapur', taluka: 'Indapur', district: 'Pune',
      complaint_text: 'Purchased government subsidized seeds but germination rate was below 20%. Total waste of investment.',
      category: 'seed_quality',
      priority: 3,
      status: 'in_progress',
      sla_days: 5,
      sla_deadline: new Date(Date.now() + 4 * 86400000).toISOString(),
      registered_by: clerkId || null,
    },
    {
      grievance_id: 'GRV-2026-00006',
      farmer_name: 'Ganesh Pandurang Thorat',
      aadhaar_last4: '2233',
      village: 'Junnar', taluka: 'Junnar', district: 'Pune',
      complaint_text: 'Scheme enrollment application submitted 45 days ago, no acknowledgement received.',
      category: 'scheme_delay',
      priority: 2,
      status: 'resolved',
      sla_days: 10,
      sla_deadline: new Date(Date.now() - 5 * 86400000).toISOString(),
      resolved_at: new Date(Date.now() - 3 * 86400000).toISOString(),
      registered_by: clerkId || null,
    },
    {
      grievance_id: 'GRV-2026-00007',
      farmer_name: 'Rajesh Namdev Bhosale',
      aadhaar_last4: '4455',
      village: 'Daund', taluka: 'Daund', district: 'Pune',
      complaint_text: 'Per Drop More Crop subsidy approved 6 months ago but amount not credited to bank account.',
      category: 'subsidy_not_received',
      priority: 3,
      status: 'registered',
      sla_days: 7,
      sla_deadline: new Date(Date.now() + 5 * 86400000).toISOString(),
      registered_by: clerkId || null,
    },
    {
      grievance_id: 'GRV-2026-00008',
      farmer_name: 'Ashok Balasaheb Gaikwad',
      aadhaar_last4: '6677',
      village: 'Maval', taluka: 'Maval', district: 'Pune',
      complaint_text: 'General query about how to apply for Kisan Credit Card.',
      category: 'other',
      priority: 1,
      status: 'resolved',
      sla_days: 7,
      sla_deadline: new Date(Date.now() + 6 * 86400000).toISOString(),
      resolved_at: new Date().toISOString(),
      registered_by: clerkId || null,
    },
    {
      grievance_id: 'GRV-2026-00009',
      farmer_name: 'Manoj Shivaji Mane',
      aadhaar_last4: '8899',
      village: 'Purandar', taluka: 'Purandar', district: 'Pune',
      complaint_text: 'Insurance claim for hailstorm damage rejected without proper inspection. Total loss ₹2 lakh.',
      category: 'crop_loss',
      priority: 4,
      status: 'registered',
      sla_days: 5,
      sla_deadline: new Date(Date.now() + 4 * 86400000).toISOString(),
      registered_by: clerkId || null,
    },
    {
      grievance_id: 'GRV-2026-00010',
      farmer_name: 'Santosh Madhav Sonawane',
      aadhaar_last4: '1122',
      village: 'Ambegaon', taluka: 'Ambegaon', district: 'Pune',
      complaint_text: 'Soil Health Card application pending from last season. Need it for current season planning.',
      category: 'scheme_delay',
      priority: 2,
      status: 'in_progress',
      sla_days: 10,
      sla_deadline: new Date(Date.now() + 7 * 86400000).toISOString(),
      registered_by: clerkId || null,
    },
  ]

  const { error } = await supabase.from('grievances').insert(grievances)
  if (error) console.error('Grievance seed error:', error.message)
  else console.log(`  Inserted ${grievances.length} grievances`)
}

async function seedDistress() {
  console.log('Seeding distress scores...')

  const distressScores = [
    {
      farmer_identifier: '4589',
      farmer_name: 'Ramesh Baburao Patil',
      taluka: 'Shirur',
      district: 'Pune',
      score: 145,
      risk_level: 'CRITICAL',
      signals: [
        { type: 'sla_breach', description: '2 unresolved grievances past SLA deadline', weight: 50 },
        { type: 'critical_grievance', description: '2 priority-5 grievances (crop loss + insurance)', weight: 80 },
        { type: 'unclaimed_benefits', description: 'Eligible for 3 schemes but only 1 application', weight: 15 },
      ],
      officer_alerted: false,
    },
    {
      farmer_identifier: '1244',
      farmer_name: 'Suresh Dattatray Deshmukh',
      taluka: 'Khed',
      district: 'Pune',
      score: 85,
      risk_level: 'HIGH',
      signals: [
        { type: 'recent_rejections', description: '3 applications rejected in last 90 days', weight: 60 },
        { type: 'sla_breach', description: '1 unresolved grievance past SLA', weight: 25 },
      ],
      officer_alerted: false,
    },
    {
      farmer_identifier: '9901',
      farmer_name: 'Vikas Ganesh Shinde',
      taluka: 'Haveli',
      district: 'Pune',
      score: 75,
      risk_level: 'HIGH',
      signals: [
        { type: 'stuck_insurance', description: '2 insurance claims stuck > 30 days', weight: 60 },
        { type: 'unclaimed_benefits', description: 'Eligible for 4 schemes but 0 applications', weight: 15 },
      ],
      officer_alerted: false,
    },
  ]

  const { error } = await supabase.from('distress_scores').insert(distressScores)
  if (error) console.error('Distress seed error:', error.message)
  else console.log(`  Inserted ${distressScores.length} distress scores`)
}

async function main() {
  console.log('═══════════════════════════════════════')
  console.log('  PRAGATI AI — Demo Data Seeding')
  console.log('═══════════════════════════════════════\n')

  const { clerkId, officerId } = await createDemoUsers()

  // Small delay for trigger to create profiles
  await new Promise(r => setTimeout(r, 1000))

  await seedApplications(clerkId)
  await seedGrievances(clerkId)
  await seedDistress()

  console.log('\n═══════════════════════════════════════')
  console.log('  Seed complete! Demo credentials:')
  console.log('  Clerk:   clerk@pragati.demo / clerk123')
  console.log('  Officer: officer@pragati.demo / officer123')
  console.log('═══════════════════════════════════════')
}

main().catch(console.error)
