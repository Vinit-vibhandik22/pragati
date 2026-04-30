import type { Scheme, FarmerProfile } from '@/types'

export const SCHEMES: Scheme[] = [
  {
    id: 'pm-kisan',
    name: 'PM-KISAN',
    nameMarathi: 'पीएम-किसान',
    benefit: 'Income support',
    benefitAmount: 'Rs. 6,000/yr',
    eligibility: {
      maxLandAcres: 5, // Actually 2 hectares (~5 acres) for small/marginal
    },
    requiredDocs: ['Aadhaar', 'Bank Passbook', 'Land Record (7/12)'],
    department: 'Subsidy Department'
  },
  {
    id: 'namo-shetkari',
    name: 'Namo Shetkari Maha Samman Nidhi',
    nameMarathi: 'नमो शेतकरी महासन्मान निधी',
    benefit: 'Income support matching PM-KISAN',
    benefitAmount: 'Rs. 6,000/yr',
    eligibility: {
      states: ['Maharashtra']
    },
    requiredDocs: ['Aadhaar', 'Bank Passbook', 'PM-KISAN Registration'],
    department: 'Subsidy Department'
  },
  {
    id: 'pmfby',
    name: 'Pradhan Mantri Fasal Bima Yojana (PMFBY)',
    nameMarathi: 'प्रधानमंत्री पीक विमा योजना',
    benefit: 'Crop insurance',
    benefitAmount: 'Varies by crop loss',
    eligibility: {
      requiresKCC: true
    },
    requiredDocs: ['Aadhaar', 'Bank Passbook', 'Land Record (7/12)', 'Crop Sowing Certificate'],
    department: 'Insurance Cell'
  },
  {
    id: 'per-drop-more-crop',
    name: 'Per Drop More Crop',
    nameMarathi: 'प्रति थेंब अधिक पीक',
    benefit: 'Irrigation equipment subsidy',
    benefitAmount: '50-55% subsidy',
    eligibility: {
      irrigationTypes: ['rainfed', 'well', 'canal']
    },
    requiredDocs: ['Aadhaar', 'Land Record (7/12)', 'Quotation for equipment'],
    department: 'Subsidy Department'
  },
  {
    id: 'shc',
    name: 'Soil Health Card Scheme',
    nameMarathi: 'मृदा आरोग्य पत्रिका योजना',
    benefit: 'Free soil testing',
    benefitAmount: 'Free',
    eligibility: {},
    requiredDocs: ['Aadhaar', 'Land Record (7/12)'],
    department: 'General'
  },
  {
    id: 'kcc',
    name: 'Kisan Credit Card',
    nameMarathi: 'किसान क्रेडिट कार्ड',
    benefit: 'Revolving credit',
    benefitAmount: 'Up to Rs. 3 Lakhs at 4%',
    eligibility: {},
    requiredDocs: ['Aadhaar', 'PAN Card', 'Land Record (7/12)', 'Passport Photo'],
    department: 'Scheme Registration'
  },
  {
    id: 'aif',
    name: 'Agri Infrastructure Fund',
    nameMarathi: 'कृषी पायाभूत सुविधा निधी',
    benefit: 'Interest subvention',
    benefitAmount: '3% subvention',
    eligibility: {},
    requiredDocs: ['Aadhaar', 'DPR (Detailed Project Report)', 'Bank Loan Sanction'],
    department: 'Scheme Registration'
  },
  {
    id: 'nmeo',
    name: 'National Mission on Edible Oils',
    nameMarathi: 'राष्ट्रीय खाद्य तेल अभियान',
    benefit: 'Grant for oilseed cultivation',
    benefitAmount: 'Rs. 10,000/acre/yr',
    eligibility: {
      crops: ['Soyabean', 'Groundnut', 'Sunflower', 'Safflower']
    },
    requiredDocs: ['Aadhaar', 'Land Record (7/12)', 'Bank Passbook'],
    department: 'Subsidy Department'
  },
  {
    id: 'pm-kmy',
    name: 'PM Kisan Maandhan Yojana',
    nameMarathi: 'पीएम किसान मानधन योजना',
    benefit: 'Pension after age 60',
    benefitAmount: 'Rs. 3,000/month',
    eligibility: {
      minAge: 18,
      maxAge: 40,
      maxLandAcres: 5
    },
    requiredDocs: ['Aadhaar', 'Bank Passbook'],
    department: 'Scheme Registration'
  },
  {
    id: 'rkvy',
    name: 'Rashtriya Krishi Vikas Yojana',
    nameMarathi: 'राष्ट्रीय कृषी विकास योजना',
    benefit: 'Grants for agri infra',
    benefitAmount: 'Project-based',
    eligibility: {},
    requiredDocs: ['Aadhaar', 'Project Proposal', 'Land Record (7/12)'],
    department: 'Scheme Registration'
  }
]

/**
 * Pre-filter schemes based on hard eligibility rules.
 * 
 * Design principle: If the profile is MISSING a field that a scheme requires,
 * we INCLUDE the scheme (let Claude reason about it with "medium" confidence).
 * We only EXCLUDE if we have definitive evidence of ineligibility.
 * 
 * Returns: { eligible: Scheme[], excluded: ExcludedScheme[] }
 */
export interface ExcludedScheme {
  id: string
  name: string
  reason: string
}

export interface PreFilterResult {
  eligible: Scheme[]
  excluded: ExcludedScheme[]
}

export function preFilterSchemes(profile: FarmerProfile): PreFilterResult {
  const eligible: Scheme[] = []
  const excluded: ExcludedScheme[] = []

  for (const scheme of SCHEMES) {
    const { eligibility } = scheme
    let reason: string | null = null

    // Land size checks — only exclude if we HAVE the data and it fails
    if (eligibility.maxLandAcres && profile.landSize !== undefined && profile.landSize > eligibility.maxLandAcres) {
      reason = `Land size ${profile.landSize} acres exceeds max ${eligibility.maxLandAcres} acres`
    }
    if (eligibility.minLandAcres && profile.landSize !== undefined && profile.landSize < eligibility.minLandAcres) {
      reason = `Land size ${profile.landSize} acres below min ${eligibility.minLandAcres} acres`
    }

    // Age checks
    if (eligibility.minAge && profile.age !== undefined && profile.age < eligibility.minAge) {
      reason = `Age ${profile.age} below minimum ${eligibility.minAge}`
    }
    if (eligibility.maxAge && profile.age !== undefined && profile.age > eligibility.maxAge) {
      reason = `Age ${profile.age} above maximum ${eligibility.maxAge}`
    }

    // Boolean prerequisite checks — only exclude if explicitly false
    if (eligibility.requiresKCC && profile.hasKCC === false) {
      reason = 'Requires Kisan Credit Card (KCC)'
    }
    if (eligibility.requiresSHC && profile.hasSHC === false) {
      reason = 'Requires Soil Health Card (SHC)'
    }

    // Crop checks — only exclude if profile HAS a crop and it doesn't match
    if (eligibility.crops && profile.primaryCrop && !eligibility.crops.includes(profile.primaryCrop)) {
      reason = `Crop "${profile.primaryCrop}" not in eligible list: ${eligibility.crops.join(', ')}`
    }

    // Irrigation checks — only exclude if profile HAS irrigation type and it doesn't match
    if (eligibility.irrigationTypes && profile.irrigationType && !eligibility.irrigationTypes.includes(profile.irrigationType)) {
      reason = `Irrigation type "${profile.irrigationType}" not eligible`
    }

    if (reason) {
      excluded.push({ id: scheme.id, name: scheme.name, reason })
    } else {
      eligible.push(scheme)
    }
  }

  return { eligible, excluded }
}

/**
 * Quick count of how many schemes a profile might be eligible for.
 * Useful for distress scoring and dashboard summaries.
 */
export function countEligibleSchemes(profile: FarmerProfile): number {
  return preFilterSchemes(profile).eligible.length
}
