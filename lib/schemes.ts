import type { Scheme, FarmerProfile } from '@/types'

export const SCHEMES: Scheme[] = [
  {
    id: 'ambedkar-yojana',
    name: 'Dr. Babasaheb Ambedkar Krushi Swavalamban Yojana (BAKSY)',
    nameMarathi: 'डॉ. बाबासाहेब आंबेडकर कृषी स्वावलंबन योजना',
    benefit: 'Subsidy for wells, pump sets, and irrigation',
    benefitAmount: 'Up to Rs. 2.5 Lakhs (varies by component)',
    eligibility: {
      minLandHectares: 0.20,
      maxLandHectares: 6.0,
      castes: ['SC', 'Nav-Boudha']
    },
    requiredDocs: ['Aadhaar', 'Land Record (7/12)', '8A Holding', 'Caste Certificate'],
    department: 'Agriculture Department'
  },
  {
    id: 'pmksy-micro-irrigation',
    name: 'PMKSY - Per Drop More Crop (Micro Irrigation)',
    nameMarathi: 'प्रधानमंत्री कृषी सिंचन योजना - सूक्ष्म सिंचन',
    benefit: 'Drip/Sprinkler irrigation subsidy',
    benefitAmount: '45% to 55% subsidy (up to Rs. 1 Lakh)',
    eligibility: {
      minLandHectares: 0.40,
      maxLandHectares: 5.0
    },
    requiredDocs: ['Aadhaar', 'Land Record (7/12)', '8A Holding', 'Bank Passbook Copy'],
    department: 'Agriculture Department'
  },
  {
    id: 'state-agri-mech',
    name: 'State Agricultural Mechanization Scheme',
    nameMarathi: 'राज्य कृषी यांत्रिकीकरण योजना',
    benefit: 'Subsidy on Tractors & Implements',
    benefitAmount: 'Up to 50% subsidy',
    eligibility: {
      minLandHectares: 0.40
    },
    requiredDocs: ['Aadhaar', 'Land Record (7/12)', '8A Holding', 'Bank Passbook Copy'],
    department: 'Agriculture Department'
  },
  {
    id: 'bhausaheb-fundkar',
    name: 'Bhausaheb Fundkar Orchard Planting Scheme',
    nameMarathi: 'भाऊसाहेब फुंडकर फळबाग लागवड योजना',
    benefit: '100% subsidy for planting fruit orchards',
    benefitAmount: 'Variable by crop (100% subsidy)',
    eligibility: {
      minLandHectares: 0.20,
      maxLandHectares: 6.0
    },
    requiredDocs: ['Aadhaar', 'Land Record (7/12)', '8A Holding'],
    department: 'Horticulture Department'
  },
  {
    id: 'birsa-munda',
    name: 'Birsa Munda Krishi Kranti Yojana',
    nameMarathi: 'बिरसा मुंडा कृषी क्रांती योजना',
    benefit: 'Subsidy for wells, pump sets for ST farmers',
    benefitAmount: 'Up to Rs. 2.5 Lakhs',
    eligibility: {
      minLandHectares: 0.20,
      maxLandHectares: 6.0,
      castes: ['ST']
    },
    requiredDocs: ['Aadhaar', 'Land Record (7/12)', '8A Holding', 'Caste Certificate'],
    department: 'Agriculture Department'
  },
  {
    id: 'magel-tyala-shet-tale',
    name: 'Magel Tyala Shet Tale',
    nameMarathi: 'मागेल त्याला शेततळे',
    benefit: 'Subsidy for constructing Farm Ponds',
    benefitAmount: 'Rs. 50,000 fixed subsidy',
    eligibility: {
      minLandHectares: 0.60
    },
    requiredDocs: ['Aadhaar', 'Land Record (7/12)', '8A Holding'],
    department: 'Agriculture Department'
  },
  {
    id: 'pm-kisan',
    name: 'PM-KISAN Samman Nidhi',
    nameMarathi: 'पीएम-किसान सन्मान निधी',
    benefit: 'Income support',
    benefitAmount: 'Rs. 6,000/yr',
    eligibility: {
      maxLandHectares: 2.0
    },
    requiredDocs: ['Aadhaar', 'Bank Passbook Copy', 'Land Record (7/12)'],
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
    requiredDocs: ['Aadhaar', 'Bank Passbook Copy', 'Land Record (7/12)'],
    department: 'Subsidy Department'
  }
]

export interface ExcludedScheme {
  id: string
  name: string
  reason: string
}

export interface MissingInfoScheme {
  id: string
  name: string
  missingData: string[]
  missingDocs: string[]
}

export interface PreFilterResult {
  eligible: Scheme[]
  excluded: ExcludedScheme[]
  missingInfo: MissingInfoScheme[]
}

export function preFilterSchemes(profile: FarmerProfile): PreFilterResult {
  const eligible: Scheme[] = []
  const excluded: ExcludedScheme[] = []
  const missingInfo: MissingInfoScheme[] = []

  for (const scheme of SCHEMES) {
    const { eligibility } = scheme
    let isExcluded = false
    let reason = ''
    const missingFields: string[] = []
    const missingDocSet = new Set<string>()

    // Check Land Hectares
    if (eligibility.maxLandHectares) {
      if (profile.landSizeHectares !== undefined) {
        if (profile.landSizeHectares > eligibility.maxLandHectares) {
          isExcluded = true
          reason = `Land size (${profile.landSizeHectares} Ha) exceeds maximum allowed (${eligibility.maxLandHectares} Ha).`
        }
      } else {
        missingFields.push('Land Size (Ha)')
        missingDocSet.add('7/12 Extract')
        missingDocSet.add('8A Holding')
      }
    }

    if (eligibility.minLandHectares && !isExcluded) {
      if (profile.landSizeHectares !== undefined) {
        if (profile.landSizeHectares < eligibility.minLandHectares) {
          isExcluded = true
          reason = `Land size (${profile.landSizeHectares} Ha) is below minimum required (${eligibility.minLandHectares} Ha).`
        }
      } else {
        missingFields.push('Land Size (Ha)')
        missingDocSet.add('7/12 Extract')
        missingDocSet.add('8A Holding')
      }
    }

    // Check Castes
    if (eligibility.castes && !isExcluded) {
      if (profile.caste) {
        if (!eligibility.castes.includes(profile.caste)) {
          isExcluded = true
          reason = `Scheme is only for ${eligibility.castes.join(', ')} categories. Detected caste: ${profile.caste}.`
        }
      } else {
        missingFields.push('Caste Category')
        missingDocSet.add('Caste Certificate')
      }
    }

    if (isExcluded) {
      excluded.push({ id: scheme.id, name: scheme.name, reason })
    } else if (missingFields.length > 0) {
      missingInfo.push({
        id: scheme.id,
        name: scheme.name,
        missingData: missingFields,
        missingDocs: Array.from(missingDocSet)
      })
    } else {
      eligible.push(scheme)
    }
  }

  return { eligible, excluded, missingInfo }
}

export function countEligibleSchemes(profile: FarmerProfile): number {
  return preFilterSchemes(profile).eligible.length
}
