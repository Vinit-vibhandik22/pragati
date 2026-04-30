import { NextResponse } from 'next/server'
import {
  MAHARASHTRA_DISTRICTS,
  CROP_OPTIONS,
  IRRIGATION_TYPES,
  INCOME_BRACKETS,
  CATEGORY_OPTIONS,
} from '@/lib/constants'
import { SCHEMES } from '@/lib/schemes'

/**
 * GET /api/constants
 * Returns all dropdown values and scheme list for frontend forms.
 * This avoids hardcoding values in the frontend and keeps everything in sync.
 */
export async function GET() {
  return NextResponse.json({
    districts: MAHARASHTRA_DISTRICTS,
    crops: CROP_OPTIONS,
    irrigationTypes: IRRIGATION_TYPES,
    incomeBrackets: INCOME_BRACKETS,
    categories: CATEGORY_OPTIONS,
    schemes: SCHEMES.map(s => ({
      id: s.id,
      name: s.name,
      nameMarathi: s.nameMarathi,
      benefit: s.benefit,
      benefitAmount: s.benefitAmount,
      requiredDocs: s.requiredDocs,
      department: s.department,
    })),
  })
}
