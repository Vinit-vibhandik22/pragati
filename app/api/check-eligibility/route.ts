import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { preFilterSchemes } from '@/lib/schemes'
import { geminiJSON } from '@/lib/gemini'
import { ELIGIBILITY_PROMPT } from '@/lib/claude'
import type { EligibilityResponse, FarmerProfile } from '@/types'

export const maxDuration = 15

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const profile: FarmerProfile = await request.json()

    if (!profile.name || !profile.district) {
      return NextResponse.json(
        { error: 'Missing farmer name or district' },
        { status: 400 }
      )
    }

    // Step 1: Fast Rule Pre-filter
    const { eligible: preFilteredSchemes, excluded } = preFilterSchemes(profile)

    if (preFilteredSchemes.length === 0) {
      // Log even zero-match checks for audit trail
      await supabase.from('eligibility_checks').insert({
        farmer_name: profile.name,
        profile_data: profile,
        matched_schemes: [],
        checked_by: user.id,
      })

      return NextResponse.json({
        matched: [],
        excluded,
        message: 'No schemes match the given profile based on eligibility rules.',
      })
    }

    // Step 2: Claude Deep Reasoning (only for pre-filtered subset)
    const claudeResult = await geminiJSON<EligibilityResponse>(
      ELIGIBILITY_PROMPT,
      `Farmer Profile:\n${JSON.stringify(profile, null, 2)}\n\nAvailable Pre-filtered Schemes:\n${JSON.stringify(
        preFilteredSchemes.map(s => ({
          id: s.id,
          name: s.name,
          benefit: s.benefit,
          benefitAmount: s.benefitAmount,
          eligibility: s.eligibility,
          requiredDocs: s.requiredDocs,
        })),
        null,
        2
      )}`
    )

    // Merge full scheme details into Claude's matches, filter hallucinated IDs
    const enrichedMatches = claudeResult.matched
      .map(match => {
        const schemeDetails = preFilteredSchemes.find(s => s.id === match.schemeId)
        return schemeDetails ? { ...match, schemeDetails } : null
      })
      .filter(Boolean)

    // Step 3: Save Log
    await supabase.from('eligibility_checks').insert({
      farmer_name: profile.name,
      profile_data: profile,
      matched_schemes: enrichedMatches,
      checked_by: user.id,
    })

    return NextResponse.json({
      matched: enrichedMatches,
      excluded,
      totalSchemesChecked: preFilteredSchemes.length + excluded.length,
    })
  } catch (error: any) {
    console.error('[check-eligibility] Error:', error)
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
