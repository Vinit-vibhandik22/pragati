-- ============================================================
-- PRAGATI AI — V2 Full Schema
-- Dr. Babasaheb Ambedkar Krushi Swavalamban Yojana
-- Run in Supabase SQL Editor
-- ============================================================

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE user_role AS ENUM (
  'farmer', 'krushi_sahayak', 'talathi', 'gram_sevak', 'tao', 'admin'
);

CREATE TYPE document_type AS ENUM (
  'form_7_12', 'form_8a', 'caste_certificate', 'income_certificate',
  'samaik_patra', 'vihir_naslyacha_dakhla',
  'moka_tapasni_photo', 'digging_phase_photo', 'brick_lining_photo',
  'invoice_phase_1', 'invoice_phase_2',
  'gsda_map', 'farmer_consent_document'
);

CREATE TYPE ai_verdict AS ENUM ('Verified', 'Rejected', 'Manual_Review_Required');
CREATE TYPE ai_run_status AS ENUM ('pending', 'processing', 'completed', 'failed');
CREATE TYPE l1_action_type AS ENUM ('approved', 'rejected', 'requested_correction');
CREATE TYPE l1_role AS ENUM ('talathi', 'gram_sevak');
CREATE TYPE field_visit_type AS ENUM ('pre_sanction_moka', 'post_sanction_digging', 'post_sanction_brick_lining');
CREATE TYPE disbursement_status AS ENUM ('pending', 'approved', 'released', 'rejected');
CREATE TYPE tao_review_type AS ENUM ('sanction_decision', 'disbursement_approval');
CREATE TYPE tao_decision AS ENUM ('approved', 'rejected', 'returned_for_correction');
CREATE TYPE gsda_zone AS ENUM ('normal', 'semi_critical', 'critical', 'over_exploited', 'dark_zone');
CREATE TYPE notification_channel AS ENUM ('in_app', 'sms');
CREATE TYPE appeal_decision AS ENUM ('upheld', 'overturned', 'pending');

-- ============================================================
-- GEOGRAPHIC + SCHEME REFERENCE TABLES
-- ============================================================

CREATE TABLE districts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  name_marathi TEXT NOT NULL
);

CREATE TABLE talukas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  district_id UUID NOT NULL REFERENCES districts(id),
  name TEXT NOT NULL,
  name_marathi TEXT NOT NULL,
  gsda_watershed_zone gsda_zone NOT NULL DEFAULT 'normal',
  is_scheme_eligible BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE villages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  taluka_id UUID NOT NULL REFERENCES talukas(id),
  name TEXT NOT NULL,
  name_marathi TEXT NOT NULL,
  gsda_zone_override gsda_zone
);

CREATE TABLE schemes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  name_marathi TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- State machine config: valid transitions per scheme
CREATE TABLE state_transitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scheme_id UUID NOT NULL REFERENCES schemes(id),
  from_state TEXT NOT NULL,
  to_state TEXT NOT NULL,
  required_role user_role,
  preconditions JSONB DEFAULT '[]',
  UNIQUE (scheme_id, from_state, to_state)
);

-- Installment phase definitions per scheme
CREATE TABLE scheme_installment_phases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scheme_id UUID NOT NULL REFERENCES schemes(id),
  phase_number INT NOT NULL,
  phase_name TEXT NOT NULL,
  phase_name_marathi TEXT NOT NULL,
  required_field_visit_type field_visit_type NOT NULL,
  required_document_type document_type NOT NULL,
  UNIQUE (scheme_id, phase_number)
);

-- Budget allocations per scheme per financial year
CREATE TABLE budget_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scheme_id UUID NOT NULL REFERENCES schemes(id),
  taluka_id UUID NOT NULL REFERENCES talukas(id),
  financial_year TEXT NOT NULL,
  total_amount DECIMAL(12,2) NOT NULL,
  committed_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  released_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (scheme_id, taluka_id, financial_year)
);

-- ============================================================
-- USERS + FARMERS
-- ============================================================

CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL,
  full_name TEXT NOT NULL,
  full_name_marathi TEXT,
  mobile_number TEXT,
  employee_id TEXT,
  taluka_id UUID REFERENCES talukas(id),
  village_id UUID REFERENCES villages(id),
  assigned_village_ids UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE farmers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  aadhaar_number TEXT UNIQUE,
  full_name_marathi TEXT NOT NULL,
  full_name_english TEXT,
  village_id UUID NOT NULL REFERENCES villages(id),
  caste_category TEXT NOT NULL CHECK (caste_category IN ('SC', 'Nav_Boudha')),
  annual_income DECIMAL(10,2),
  registered_by UUID NOT NULL REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- APPLICATIONS
-- ============================================================

CREATE TABLE applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_number TEXT UNIQUE NOT NULL,
  scheme_id UUID NOT NULL REFERENCES schemes(id),
  farmer_id UUID NOT NULL REFERENCES farmers(id),

  -- Assignment
  created_by_ks_id UUID NOT NULL REFERENCES user_profiles(id),
  taluka_id UUID NOT NULL REFERENCES talukas(id),
  village_id UUID NOT NULL REFERENCES villages(id),
  talathi_user_id UUID REFERENCES user_profiles(id),
  gram_sevak_user_id UUID REFERENCES user_profiles(id),
  tao_user_id UUID REFERENCES user_profiles(id),
  budget_allocation_id UUID REFERENCES budget_allocations(id),

  -- State machine (VARCHAR — enforced by state_transitions table)
  current_state TEXT NOT NULL DEFAULT 'DRAFT',

  -- Proxy submission
  proxy_submission BOOLEAN NOT NULL DEFAULT true,
  farmer_consent_document_id UUID,

  -- Land details
  survey_number TEXT,
  land_area_ha DECIMAL(6,4),
  has_multiple_owners BOOLEAN,

  -- AI pipeline
  latest_ai_run_id UUID,

  -- L1 flags
  talathi_approved_at TIMESTAMPTZ,
  gram_sevak_approved_at TIMESTAMPTZ,

  -- Sanction
  sanction_order_number TEXT,
  sanction_date DATE,
  total_sanctioned_amount DECIMAL(12,2),
  gsda_zone_verified BOOLEAN,
  scsp_budget_head_verified BOOLEAN,

  -- Rejection
  rejection_reason TEXT,
  rejected_by UUID REFERENCES user_profiles(id),
  rejected_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE SEQUENCE IF NOT EXISTS application_seq;

CREATE OR REPLACE FUNCTION get_next_app_seq()
RETURNS BIGINT AS $$
BEGIN
  RETURN nextval('application_seq');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- DOCUMENTS
-- ============================================================

CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  document_type document_type NOT NULL,
  storage_path TEXT NOT NULL,
  file_size_bytes BIGINT,
  mime_type TEXT,
  uploaded_by UUID NOT NULL REFERENCES user_profiles(id),
  uploaded_at TIMESTAMPTZ DEFAULT now(),
  ocr_text TEXT,
  is_geo_tagged BOOLEAN DEFAULT false,
  geo_latitude DECIMAL(9,6),
  geo_longitude DECIMAL(9,6),
  geo_timestamp TIMESTAMPTZ,
  geo_valid BOOLEAN,
  geo_distance_from_survey_meters INT
);

-- Deferred FKs now that documents table exists
ALTER TABLE applications
  ADD CONSTRAINT fk_farmer_consent_doc
    FOREIGN KEY (farmer_consent_document_id) REFERENCES documents(id);

-- ============================================================
-- AI VERIFICATION RUNS
-- ============================================================

CREATE TABLE ai_verification_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  triggered_by UUID NOT NULL REFERENCES user_profiles(id),
  triggered_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  status ai_run_status NOT NULL DEFAULT 'pending',
  retry_count INT NOT NULL DEFAULT 0,
  next_retry_at TIMESTAMPTZ,
  verdict ai_verdict,
  verdict_reason TEXT,
  extracted_data JSONB,
  mistral_raw_response JSONB,
  failure_reasons JSONB DEFAULT '[]',
  ocr_confidence_score DECIMAL(4,3),
  document_ids UUID[] NOT NULL DEFAULT '{}'
);

ALTER TABLE applications
  ADD CONSTRAINT fk_latest_ai_run
    FOREIGN KEY (latest_ai_run_id) REFERENCES ai_verification_runs(id);

-- ============================================================
-- L1 ACTIONS (Talathi + Gram Sevak)
-- ============================================================

CREATE TABLE l1_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  action_by UUID NOT NULL REFERENCES user_profiles(id),
  role l1_role NOT NULL,
  action l1_action_type NOT NULL,
  document_id UUID REFERENCES documents(id),
  remarks TEXT,
  samaik_patra_stamp_verified BOOLEAN,
  samaik_patra_stamp_value TEXT,
  action_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- L2 FIELD REPORTS (KS ground visits)
-- ============================================================

CREATE TABLE l2_field_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  ks_user_id UUID NOT NULL REFERENCES user_profiles(id),
  visit_type field_visit_type NOT NULL,
  document_id UUID NOT NULL REFERENCES documents(id),
  field_observations TEXT,
  submitted_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- TAO REVIEWS
-- ============================================================

CREATE TABLE tao_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  tao_user_id UUID NOT NULL REFERENCES user_profiles(id),
  review_type tao_review_type NOT NULL,
  decision tao_decision NOT NULL,
  gsda_zone_status gsda_zone,
  gsda_zone_compliant BOOLEAN,
  scsp_budget_head_verified BOOLEAN,
  gsda_map_document_id UUID REFERENCES documents(id),
  remarks TEXT NOT NULL,
  reviewed_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- DISBURSEMENT INSTALLMENTS
-- ============================================================

CREATE TABLE disbursement_installments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  phase_id UUID NOT NULL REFERENCES scheme_installment_phases(id),
  installment_number INT NOT NULL,
  invoice_document_id UUID REFERENCES documents(id),
  field_report_id UUID REFERENCES l2_field_reports(id),
  amount_requested DECIMAL(12,2),
  amount_approved DECIMAL(12,2),
  status disbursement_status NOT NULL DEFAULT 'pending',
  approved_by UUID REFERENCES user_profiles(id),
  approval_order_number TEXT,
  released_at TIMESTAMPTZ,
  UNIQUE (application_id, installment_number)
);

-- ============================================================
-- APPEALS
-- ============================================================

CREATE TABLE appeals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  filed_by UUID NOT NULL REFERENCES user_profiles(id),
  reason TEXT NOT NULL,
  supporting_document_id UUID REFERENCES documents(id),
  reviewing_officer_id UUID REFERENCES user_profiles(id),
  decision appeal_decision NOT NULL DEFAULT 'pending',
  decision_remarks TEXT,
  filed_at TIMESTAMPTZ DEFAULT now(),
  decided_at TIMESTAMPTZ
);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID NOT NULL REFERENCES user_profiles(id),
  application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  message_marathi TEXT,
  channel notification_channel NOT NULL DEFAULT 'in_app',
  is_read BOOLEAN NOT NULL DEFAULT false,
  sent_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- AUDIT LOG (immutable)
-- ============================================================

CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID REFERENCES applications(id),
  actor_id UUID REFERENCES user_profiles(id),
  action TEXT NOT NULL,
  from_state TEXT,
  to_state TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE RULE no_update_audit AS ON UPDATE TO audit_log DO INSTEAD NOTHING;
CREATE RULE no_delete_audit AS ON DELETE TO audit_log DO INSTEAD NOTHING;

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_applications_farmer ON applications(farmer_id);
CREATE INDEX idx_applications_taluka ON applications(taluka_id);
CREATE INDEX idx_applications_state ON applications(current_state);
CREATE INDEX idx_applications_scheme ON applications(scheme_id);
CREATE INDEX idx_documents_application ON documents(application_id);
CREATE INDEX idx_documents_type ON documents(document_type);
CREATE INDEX idx_ai_runs_application ON ai_verification_runs(application_id);
CREATE INDEX idx_notifications_recipient ON notifications(recipient_id, is_read);
CREATE INDEX idx_audit_log_application ON audit_log(application_id);

-- ============================================================
-- STATE TRANSITION FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION transition_application_status(
  p_app_id UUID,
  p_new_state TEXT,
  p_actor_id UUID,
  p_metadata JSONB DEFAULT '{}'
) RETURNS VOID AS $$
DECLARE
  v_current_state TEXT;
  v_scheme_id UUID;
  v_transition_exists BOOLEAN;
BEGIN
  SELECT current_state, scheme_id
  INTO v_current_state, v_scheme_id
  FROM applications
  WHERE id = p_app_id
  FOR UPDATE NOWAIT;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Application % not found', p_app_id;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM state_transitions
    WHERE scheme_id = v_scheme_id
      AND from_state = v_current_state
      AND to_state = p_new_state
  ) INTO v_transition_exists;

  IF NOT v_transition_exists THEN
    RAISE EXCEPTION 'Invalid transition: % -> % for scheme %',
      v_current_state, p_new_state, v_scheme_id;
  END IF;

  UPDATE applications
  SET current_state = p_new_state, updated_at = now()
  WHERE id = p_app_id;

  INSERT INTO audit_log (application_id, actor_id, action, from_state, to_state, metadata)
  VALUES (p_app_id, p_actor_id, 'STATE_TRANSITION', v_current_state, p_new_state, p_metadata);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- GEO VALIDATION
-- ============================================================

CREATE OR REPLACE FUNCTION validate_geo_coordinates(
  p_lat DECIMAL,
  p_lng DECIMAL
) RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    p_lat BETWEEN 15.6 AND 22.1
    AND p_lng BETWEEN 72.6 AND 80.9
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION set_geo_valid() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_geo_tagged AND NEW.geo_latitude IS NOT NULL THEN
    NEW.geo_valid := validate_geo_coordinates(NEW.geo_latitude, NEW.geo_longitude);
  ELSE
    NEW.geo_valid := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_geo_valid
  BEFORE INSERT OR UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION set_geo_valid();

-- Auto-update updated_at on applications
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER applications_updated_at
  BEFORE UPDATE ON applications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-create user_profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    COALESCE(NEW.raw_user_meta_data->>'role', 'krushi_sahayak')::user_role
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE l1_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE l2_field_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE tao_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE disbursement_installments ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE farmers ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION current_user_profile()
RETURNS user_profiles AS $$
  SELECT * FROM user_profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- user_profiles: anyone authenticated can read their own
CREATE POLICY profiles_self_select ON user_profiles FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY profiles_self_update ON user_profiles FOR UPDATE
  USING (id = auth.uid());

-- farmers
CREATE POLICY farmers_farmer_select ON farmers FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY farmers_ks_select ON farmers FOR SELECT
  USING (
    (current_user_profile()).role = 'krushi_sahayak'
    AND village_id = ANY((current_user_profile()).assigned_village_ids)
  );

CREATE POLICY farmers_tao_select ON farmers FOR SELECT
  USING (
    (current_user_profile()).role = 'tao'
    AND EXISTS (
      SELECT 1 FROM villages v
      WHERE v.id = farmers.village_id
        AND v.taluka_id = (current_user_profile()).taluka_id
    )
  );

CREATE POLICY farmers_ks_insert ON farmers FOR INSERT
  WITH CHECK ((current_user_profile()).role = 'krushi_sahayak');

-- applications
CREATE POLICY apps_farmer_select ON applications FOR SELECT
  USING (farmer_id IN (SELECT id FROM farmers WHERE user_id = auth.uid()));

CREATE POLICY apps_ks_select ON applications FOR SELECT
  USING (
    (current_user_profile()).role = 'krushi_sahayak'
    AND village_id = ANY((current_user_profile()).assigned_village_ids)
  );

CREATE POLICY apps_talathi_select ON applications FOR SELECT
  USING (
    (current_user_profile()).role = 'talathi'
    AND village_id = (current_user_profile()).village_id
    AND talathi_user_id = auth.uid()
  );

CREATE POLICY apps_gramsevak_select ON applications FOR SELECT
  USING (
    (current_user_profile()).role = 'gram_sevak'
    AND village_id = (current_user_profile()).village_id
    AND gram_sevak_user_id = auth.uid()
  );

CREATE POLICY apps_tao_select ON applications FOR SELECT
  USING (
    (current_user_profile()).role = 'tao'
    AND taluka_id = (current_user_profile()).taluka_id
  );

CREATE POLICY apps_ks_insert ON applications FOR INSERT
  WITH CHECK ((current_user_profile()).role = 'krushi_sahayak');

-- documents: inherit application access
CREATE POLICY docs_select ON documents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM applications a WHERE a.id = documents.application_id
    )
  );

CREATE POLICY docs_insert ON documents FOR INSERT
  WITH CHECK (
    (current_user_profile()).role IN ('krushi_sahayak', 'talathi', 'gram_sevak', 'tao')
  );

-- notifications: each user sees only their own
CREATE POLICY notif_select ON notifications FOR SELECT
  USING (recipient_id = auth.uid());

CREATE POLICY notif_update ON notifications FOR UPDATE
  USING (recipient_id = auth.uid())
  WITH CHECK (recipient_id = auth.uid());

-- ============================================================
-- SEED DATA: 1 District, 1 Taluka, 3 Villages, 1 Scheme (DBKSY)
-- ============================================================

DO $$
DECLARE
  v_district_id UUID;
  v_taluka_id UUID;
  v_village1_id UUID;
  v_village2_id UUID;
  v_village3_id UUID;
  v_scheme_id UUID;
BEGIN
  -- District
  INSERT INTO districts (name, name_marathi) VALUES ('Pune', 'पुणे')
  RETURNING id INTO v_district_id;

  -- Taluka
  INSERT INTO talukas (district_id, name, name_marathi, gsda_watershed_zone, is_scheme_eligible)
  VALUES (v_district_id, 'Baramati', 'बारामती', 'normal', true)
  RETURNING id INTO v_taluka_id;

  -- Villages
  INSERT INTO villages (taluka_id, name, name_marathi) VALUES (v_taluka_id, 'Malegaon', 'मालेगाव') RETURNING id INTO v_village1_id;
  INSERT INTO villages (taluka_id, name, name_marathi) VALUES (v_taluka_id, 'Undavadi', 'उंडवडी') RETURNING id INTO v_village2_id;
  INSERT INTO villages (taluka_id, name, name_marathi) VALUES (v_taluka_id, 'Pimpari', 'पिंपरी') RETURNING id INTO v_village3_id;

  -- Scheme: DBKSY (New Well Construction)
  INSERT INTO schemes (name, name_marathi, description, is_active)
  VALUES (
    'Dr. Babasaheb Ambedkar Krushi Swavalamban Yojana',
    'डॉ. बाबासाहेब आंबेडकर कृषी स्वावलंबन योजना',
    'New well construction subsidy for SC/Nav-Boudha farmers',
    true
  ) RETURNING id INTO v_scheme_id;

  -- State transitions
  INSERT INTO state_transitions (scheme_id, from_state, to_state, required_role) VALUES
    (v_scheme_id, 'DRAFT', 'PENDING_DOCUMENTS', 'krushi_sahayak'),
    (v_scheme_id, 'PENDING_DOCUMENTS', 'PENDING_AI_VERIFICATION', 'krushi_sahayak'),
    (v_scheme_id, 'PENDING_AI_VERIFICATION', 'AI_VERIFIED', NULL),
    (v_scheme_id, 'PENDING_AI_VERIFICATION', 'AI_REJECTED', NULL),
    (v_scheme_id, 'PENDING_AI_VERIFICATION', 'PENDING_MANUAL_REVIEW', NULL),
    (v_scheme_id, 'AI_REJECTED', 'UNDER_APPEAL', 'krushi_sahayak'),
    (v_scheme_id, 'PENDING_MANUAL_REVIEW', 'AI_VERIFIED', 'tao'),
    (v_scheme_id, 'PENDING_MANUAL_REVIEW', 'AI_REJECTED', 'tao'),
    (v_scheme_id, 'UNDER_APPEAL', 'PENDING_AI_VERIFICATION', 'tao'),
    (v_scheme_id, 'UNDER_APPEAL', 'AI_REJECTED', 'tao'),
    (v_scheme_id, 'AI_VERIFIED', 'PENDING_GRAM_SEVAK_CERT', NULL),
    (v_scheme_id, 'AI_VERIFIED', 'PENDING_TALATHI_CONSENT', NULL),
    (v_scheme_id, 'PENDING_TALATHI_CONSENT', 'PENDING_GRAM_SEVAK_CERT', 'talathi'),
    (v_scheme_id, 'PENDING_GRAM_SEVAK_CERT', 'L1_COMPLETE', 'gram_sevak'),
    (v_scheme_id, 'L1_COMPLETE', 'PENDING_L2_FIELD_VISIT', NULL),
    (v_scheme_id, 'PENDING_L2_FIELD_VISIT', 'L2_REPORT_SUBMITTED', 'krushi_sahayak'),
    (v_scheme_id, 'L2_REPORT_SUBMITTED', 'PENDING_TAO_REVIEW', NULL),
    (v_scheme_id, 'PENDING_TAO_REVIEW', 'TAO_APPROVED', 'tao'),
    (v_scheme_id, 'PENDING_TAO_REVIEW', 'TAO_REJECTED', 'tao'),
    (v_scheme_id, 'PENDING_TAO_REVIEW', 'RETURNED_FOR_CORRECTION', 'tao'),
    (v_scheme_id, 'RETURNED_FOR_CORRECTION', 'PENDING_L2_FIELD_VISIT', 'krushi_sahayak'),
    (v_scheme_id, 'TAO_REJECTED', 'UNDER_APPEAL', 'krushi_sahayak'),
    (v_scheme_id, 'TAO_APPROVED', 'EXECUTION_PHASE_1_PENDING', NULL),
    (v_scheme_id, 'EXECUTION_PHASE_1_PENDING', 'EXECUTION_PHASE_1_COMPLETE', 'tao'),
    (v_scheme_id, 'EXECUTION_PHASE_1_COMPLETE', 'EXECUTION_PHASE_2_PENDING', NULL),
    (v_scheme_id, 'EXECUTION_PHASE_2_PENDING', 'EXECUTION_PHASE_2_COMPLETE', 'tao'),
    (v_scheme_id, 'EXECUTION_PHASE_2_COMPLETE', 'SCHEME_COMPLETE', NULL);

  -- Installment phases
  INSERT INTO scheme_installment_phases (scheme_id, phase_number, phase_name, phase_name_marathi, required_field_visit_type, required_document_type)
  VALUES
    (v_scheme_id, 1, 'Digging Phase', 'खोदकाम टप्पा', 'post_sanction_digging', 'digging_phase_photo'),
    (v_scheme_id, 2, 'Brick Lining Phase', 'दगडी बांधकाम टप्पा', 'post_sanction_brick_lining', 'brick_lining_photo');

  -- Budget allocation for current year
  INSERT INTO budget_allocations (scheme_id, taluka_id, financial_year, total_amount, committed_amount, released_amount)
  VALUES (v_scheme_id, v_taluka_id, '2025-26', 5000000.00, 0.00, 0.00);

END $$;
