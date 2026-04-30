import { NextResponse } from 'next/server'

/**
 * GET /api/health
 * 
 * Health check endpoint — used by monitoring, uptime checks, and demo validation.
 * Returns system status without requiring authentication.
 */
export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    version: '1.0.0',
    service: 'PRAGATI AI',
    timestamp: new Date().toISOString(),
    modules: {
      classification: 'active',
      fraud_detection: 'active',
      grievance_nlp: 'active',
      distress_intelligence: 'active',
      legal_analysis: 'active',
      scheme_eligibility: 'active',
    },
  })
}
