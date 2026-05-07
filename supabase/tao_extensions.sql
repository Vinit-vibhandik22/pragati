
-- PRAGATI AI — TAO Review Panel Schema Extensions

-- 1. Applications Table Extensions
ALTER TABLE applications ADD COLUMN IF NOT EXISTS current_state TEXT DEFAULT 'PENDING_CLERK_UPLOAD';
ALTER TABLE applications ADD COLUMN IF NOT EXISTS taluka_id UUID;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS document_id UUID;

-- 2. Talukas Table (Groundwater Zone Info)
CREATE TABLE IF NOT EXISTS talukas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  district TEXT NOT NULL,
  groundwater_zone TEXT CHECK (groundwater_zone IN ('SAFE', 'SEMI_CRITICAL', 'CRITICAL', 'OVER_EXPLOITED', 'DARK_ZONE')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Budget Allocations (SCSP Budget)
CREATE TABLE IF NOT EXISTS budget_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  taluka_id UUID REFERENCES talukas(id),
  scheme_id TEXT NOT NULL,
  total_budget NUMERIC DEFAULT 0,
  spent_budget NUMERIC DEFAULT 0,
  remaining_budget NUMERIC GENERATED ALWAYS AS (total_budget - spent_budget) STORED,
  fiscal_year TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. AI Verification Runs (Extracted Data Store)
CREATE TABLE IF NOT EXISTS ai_verification_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID REFERENCES applications(id),
  verdict TEXT CHECK (verdict IN ('Verified', 'Rejected', 'Manual_Review_Required')),
  extracted_data JSONB DEFAULT '{}'::jsonb,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. TAO Reviews (Final Sanction Order Store)
CREATE TABLE IF NOT EXISTS tao_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID REFERENCES applications(id),
  officer_id UUID REFERENCES profiles(id),
  verdict TEXT CHECK (verdict IN ('APPROVED', 'REJECTED')),
  remarks TEXT NOT NULL,
  sanction_order_number TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. RPC: transition_application_status
CREATE OR REPLACE FUNCTION transition_application_status(
  p_application_id UUID,
  p_new_state TEXT,
  p_actor_id UUID,
  p_remarks TEXT DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
  -- Update application state
  UPDATE applications 
  SET 
    current_state = p_new_state,
    status = CASE 
      WHEN p_new_state = 'TAO_APPROVED' THEN 'approved'
      WHEN p_new_state = 'TAO_REJECTED' THEN 'rejected'
      ELSE status
    END,
    updated_at = NOW()
  WHERE id = p_application_id;

  -- Log to audit trail
  INSERT INTO audit_log (actor_id, action, target_type, target_id, details)
  VALUES (
    p_actor_id, 
    'status_transition', 
    'application', 
    p_application_id::TEXT, 
    jsonb_build_object('new_state', p_new_state, 'remarks', p_remarks)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Seed some Taluka and Budget data for demo
INSERT INTO talukas (name, district, groundwater_zone)
VALUES ('Haveli', 'Pune', 'OVER_EXPLOITED')
ON CONFLICT DO NOTHING;

INSERT INTO budget_allocations (taluka_id, scheme_id, total_budget, spent_budget, fiscal_year)
SELECT id, 'PM-KISAN', 5000000, 1250000, '2024-25' FROM talukas WHERE name = 'Haveli'
ON CONFLICT DO NOTHING;
