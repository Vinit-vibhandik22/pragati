export type UserRole = 'clerk' | 'officer'
export type DocumentType = 'subsidy_application' | 'insurance_claim' | 'scheme_enrollment' | 'land_record' | 'grievance' | 'other'
export type RiskScore = 'LOW' | 'MEDIUM' | 'HIGH'
export type ApplicationStatus = 'pending' | 'in_review' | 'approved' | 'rejected' | 'held'
export type GrievanceCategory = 'water_supply' | 'seed_quality' | 'scheme_delay' | 'officer_misconduct' | 'subsidy_not_received' | 'crop_loss' | 'other'
export type GrievanceStatus = 'registered' | 'in_progress' | 'resolved' | 'escalated'
export type DistressLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

export interface Profile {
  id: string
  full_name: string
  role: UserRole
  district: string | null
  taluka: string | null
  office_name: string | null
}

export interface Application {
  id: string
  app_id: string
  farmer_name: string
  aadhaar_last4: string | null
  village: string | null
  taluka: string | null
  district: string | null
  document_type: DocumentType | null
  scheme_name: string | null
  claimed_amount: number | null
  extracted_text: string | null
  file_url: string | null
  risk_score: RiskScore
  irregularity_flags: IrregularityFlag[]
  status: ApplicationStatus
  department: string | null
  assigned_officer_id: string | null
  submitted_by: string | null
  submitted_at: string
  updated_at: string
  pre_rejection_warnings: PreRejectionWarning[]
}

export interface IrregularityFlag {
  type: string
  detail: string
  severity: 'low' | 'medium' | 'high'
  matched_app_id?: string
}

export interface PreRejectionWarning {
  field: string
  issue: string
  suggestedFix: string
  severity: 'warning' | 'error'
}

export interface Grievance {
  id: string
  grievance_id: string
  farmer_name: string
  aadhaar_last4: string | null
  village: string | null
  taluka: string | null
  district: string | null
  complaint_text: string
  category: GrievanceCategory | null
  priority: number | null
  priority_reason: string | null
  status: GrievanceStatus
  sla_days: number
  sla_deadline: string | null
  registered_by: string | null
  registered_at: string
  resolved_at: string | null
}

export interface Scheme {
  id: string
  name: string
  nameMarathi: string
  benefit: string
  benefitAmount: string
  eligibility: {
    maxLandAcres?: number
    minLandAcres?: number
    states?: string[]
    categories?: string[]
    crops?: string[]
    maxIncomeCategory?: string
    irrigationTypes?: string[]
    requiresKCC?: boolean
    requiresSHC?: boolean
    maxAge?: number
    minAge?: number
  }
  requiredDocs: string[]
  department: string
}

export interface DistressScore {
  id: string
  farmer_identifier: string
  farmer_name: string | null
  taluka: string | null
  district: string | null
  score: number
  risk_level: DistressLevel
  signals: DistressSignal[]
  computed_at: string
}

export interface DistressSignal {
  type: string
  description: string
  weight: number
}

// API Response types
export interface ClassifyDocumentResponse {
  documentType: DocumentType
  schemeName: string | null
  claimedAmount: number | null
  cropType: string | null
  farmerName: string | null
  confidence: 'high' | 'medium' | 'low'
  department: string
}

export interface EligibilityResponse {
  matched: Array<{ schemeId: string; reason: string; confidence: 'high' | 'medium' }>
}

export interface GrievanceAnalysisResponse {
  category: GrievanceCategory
  priority: number
  priorityReason: string
  suggestedDepartment: string
}

export interface IrregularityResult {
  riskScore: RiskScore
  flags: IrregularityFlag[]
}

export interface NewApplication {
  app_id: string
  farmer_name: string
  aadhaar_last4: string | null
  village: string | null
  taluka: string | null
  district: string
  document_type: DocumentType | null
  scheme_name: string | null
  claimed_amount: number | null
  extracted_text: string | null
  file_url: string | null
  risk_score: RiskScore
  irregularity_flags: IrregularityFlag[]
  status: ApplicationStatus
  department: string | null
  submitted_by: string | null
  pre_rejection_warnings: PreRejectionWarning[]
}

export interface AuditLogEntry {
  id?: string
  actor_id: string
  action: string
  target_type: 'application' | 'grievance' | 'eligibility_check'
  target_id: string
  details?: Record<string, any>
  created_at?: string
}

export interface LegalAnalysisResponse {
  documentType: string
  parties: Array<{ role: string; name: string }>
  propertyDetails: {
    surveyNumber: string | null
    area: string | null
    location: string | null
  }
  keyAmount: number | null
  clauses: Array<{
    text: string
    plain: string
    risk: 'standard' | 'unusual' | 'harmful'
    riskReason: string | null
  }>
  stampDutyCheck: 'sufficient' | 'insufficient' | 'unknown'
  registrationRequired: boolean
  overallRisk: 'low' | 'medium' | 'high'
}

export interface FarmerProfile {
  name: string
  age?: number
  district: string
  taluka?: string
  landSize?: number // in acres
  primaryCrop?: string
  irrigationType?: string
  category?: string // General, OBC, SC, ST
  incomeCategory?: string
  hasKCC?: boolean
  hasSHC?: boolean
}

