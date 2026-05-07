
-- PRAGATI AI — Comprehensive Demo Seed Data
-- Target: Supabase SQL Editor

-- 0. Clear existing demo data (Optional - Use with caution)
-- TRUNCATE public.profiles, public.applications, public.talukas CASCADE;

-- 1. Setup District & Taluka (Pune/Baramati)
INSERT INTO public.talukas (name, district, groundwater_zone)
VALUES ('Baramati', 'Pune', 'SAFE')
ON CONFLICT DO NOTHING;

-- 2. Setup Budget (₹50L for FY 26-27)
INSERT INTO public.budget_allocations (taluka_id, scheme_id, total_budget, spent_budget, fiscal_year)
SELECT id, 'DBKSY', 5000000, 450000, '2026-27' 
FROM public.talukas WHERE name = 'Baramati'
ON CONFLICT DO NOTHING;

-- 3. Create Demo Profiles
-- Note: These IDs should match the auth.users IDs if created via dashboard.
-- For demo purposes, we seed them with fixed UUIDs.
INSERT INTO public.profiles (id, full_name, role, district, taluka)
VALUES 
  ('00000000-0000-0000-0000-000000000001', 'Krutarth Shinde', 'clerk', 'Pune', 'Baramati'),
  ('00000000-0000-0000-0000-000000000002', 'Talathi Officer', 'officer', 'Pune', 'Baramati'),
  ('00000000-0000-0000-0000-000000000003', 'Gram Sevak Officer', 'officer', 'Pune', 'Baramati'),
  ('00000000-0000-0000-0000-000000000004', 'TAO Officer', 'officer', 'Pune', 'Baramati'),
  ('00000000-0000-0000-0000-000000000005', 'Farmer Demo', 'clerk', 'Pune', 'Baramati')
ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name;

-- 4. Demo Applications

-- APP 1: Fresh (PENDING_DOCUMENTS)
INSERT INTO public.applications (
  id, app_id, farmer_name, aadhaar_last4, village, taluka, district, 
  scheme_name, status, current_state, submitted_at, taluka_id
) VALUES (
  gen_random_uuid(), 'PRAG-2026-001', 'Suresh Kulkarni', '4455', 'Malegaon', 'Baramati', 'Pune',
  'DBKSY', 'pending', 'PENDING_DOCUMENTS', NOW() - INTERVAL '1 day',
  (SELECT id FROM public.talukas WHERE name = 'Baramati')
);

-- APP 2: Ready for TAO Review (PENDING_TAO_REVIEW)
INSERT INTO public.applications (
  id, app_id, farmer_name, aadhaar_last4, village, taluka, district, 
  scheme_name, status, current_state, submitted_at, taluka_id
) VALUES (
  '00000000-0000-0000-0000-000000000012', 'PRAG-2026-002', 'Mahesh Patil', '8899', 'Supa', 'Baramati', 'Pune',
  'DBKSY', 'pending', 'PENDING_TAO_REVIEW', NOW() - INTERVAL '5 days',
  (SELECT id FROM public.talukas WHERE name = 'Baramati')
);

-- Seed L1 Actions for App 2
INSERT INTO public.audit_log (actor_id, action, target_type, target_id, details)
VALUES 
  ('00000000-0000-0000-0000-000000000002', 'L1_APPROVAL', 'application', '00000000-0000-0000-0000-000000000012', '{"role": "talathi", "remarks": "Documents verified locally."}'),
  ('00000000-0000-0000-0000-000000000003', 'L1_APPROVAL', 'application', '00000000-0000-0000-0000-000000000012', '{"role": "gram_sevak", "remarks": "Residence certificate confirmed."}');

-- APP 3: Sanctioned (TAO_APPROVED)
INSERT INTO public.applications (
  id, app_id, farmer_name, aadhaar_last4, village, taluka, district, 
  scheme_name, status, current_state, submitted_at, taluka_id
) VALUES (
  '00000000-0000-0000-0000-000000000013', 'PRAG-2026-003', 'Vithal Rao', '1234', 'Undawadi', 'Baramati', 'Pune',
  'DBKSY', 'approved', 'TAO_APPROVED', NOW() - INTERVAL '10 days',
  (SELECT id FROM public.talukas WHERE name = 'Baramati')
);

-- Seed Final Review for App 3
INSERT INTO public.tao_reviews (application_id, officer_id, verdict, remarks, sanction_order_number)
VALUES (
  '00000000-0000-0000-0000-000000000013', 
  '00000000-0000-0000-0000-000000000004', 
  'APPROVED', 
  'Excellent site report. Budget available. Proceed with digging phase.', 
  'PRAG-SANC-2026-99001'
);

-- Seed AI Run for App 3 (History)
INSERT INTO public.ai_verification_runs (application_id, verdict, extracted_data, reason)
VALUES (
  '00000000-0000-0000-0000-000000000013',
  'Verified',
  '{"surveyNumber": "142/A", "landArea": "2.40", "farmerName": "Vithal Rao"}',
  'AI auto-match successful. 100% data consistency found across 7/12 and 8A extracts.'
);

-- Note: Ensure you create auth users with IDs 00000...0001 to 00000...0005 
-- OR update these IDs after creating users in the dashboard.
