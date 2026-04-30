import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkIrregularities } from '@/lib/fraud'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { application } = await request.json()
    
    if (!application) {
      return NextResponse.json({ error: 'Missing application data' }, { status: 400 })
    }

    const result = await checkIrregularities(supabase, application)

    return NextResponse.json(result)

  } catch (error) {
    console.error('Fraud check error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
