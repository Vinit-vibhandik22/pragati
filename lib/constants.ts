import type { DocumentType, GrievanceCategory } from '@/types'

// ─── SLA Configuration (days) ────────────────────────────────────────────────

export const SLA_CONFIG: Record<DocumentType, number> = {
  subsidy_application: 7,
  insurance_claim: 14,
  scheme_enrollment: 7,
  land_record: 3,
  grievance: 7,
  other: 10,
}

export const GRIEVANCE_SLA_CONFIG: Record<GrievanceCategory, number> = {
  water_supply: 3,
  seed_quality: 5,
  scheme_delay: 10,
  officer_misconduct: 2,
  subsidy_not_received: 7,
  crop_loss: 5,
  other: 7,
}

// ─── Departments ─────────────────────────────────────────────────────────────

export const DEPARTMENTS = [
  'Subsidy Department',
  'Insurance Cell',
  'Scheme Registration',
  'Land Records',
  'Grievance Cell',
  'General',
] as const

// ─── Maharashtra Districts (all 36) ─────────────────────────────────────────

export const MAHARASHTRA_DISTRICTS = [
  'Ahmednagar', 'Akola', 'Amravati', 'Aurangabad', 'Beed',
  'Bhandara', 'Buldhana', 'Chandrapur', 'Dhule', 'Gadchiroli',
  'Gondia', 'Hingoli', 'Jalgaon', 'Jalna', 'Kolhapur',
  'Latur', 'Mumbai City', 'Mumbai Suburban', 'Nagpur', 'Nanded',
  'Nandurbar', 'Nashik', 'Osmanabad', 'Palghar', 'Parbhani',
  'Pune', 'Raigad', 'Ratnagiri', 'Sangli', 'Satara',
  'Sindhudurg', 'Solapur', 'Thane', 'Wardha', 'Washim', 'Yavatmal',
] as const

// ─── Crop Dropdown Options ───────────────────────────────────────────────────

export const CROP_OPTIONS = [
  'Rice', 'Wheat', 'Jowar', 'Bajra', 'Maize',
  'Sugarcane', 'Cotton', 'Soyabean', 'Groundnut',
  'Tur (Pigeon Pea)', 'Gram (Chana)', 'Onion', 'Grapes',
  'Pomegranate', 'Banana', 'Mango', 'Orange',
  'Sunflower', 'Safflower', 'Turmeric', 'Other',
] as const

// ─── Irrigation Dropdown Options ─────────────────────────────────────────────

export const IRRIGATION_TYPES = [
  'rainfed', 'well', 'drip', 'canal',
] as const

// ─── Income Bracket Options ──────────────────────────────────────────────────

export const INCOME_BRACKETS = [
  'Below ₹1 Lakh',
  '₹1-2.5 Lakhs',
  '₹2.5-5 Lakhs',
  '₹5-10 Lakhs',
  'Above ₹10 Lakhs',
] as const

// ─── Category Options ────────────────────────────────────────────────────────

export const CATEGORY_OPTIONS = [
  'General', 'OBC', 'SC', 'ST',
] as const

// ─── Application ID Generation ───────────────────────────────────────────────

let _appCounter = 0
export function generateAppId(): string {
  const num = Date.now() % 100000 // Last 5 digits of timestamp
  _appCounter = (_appCounter + 1) % 100
  const padded = String(num + _appCounter).padStart(5, '0')
  return `SUB-2026-${padded}`
}

export function generateGrievanceId(): string {
  const num = Date.now() % 100000
  _appCounter = (_appCounter + 1) % 100
  const padded = String(num + _appCounter).padStart(5, '0')
  return `GRV-2026-${padded}`
}
