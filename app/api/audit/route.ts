import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/audit
 * 
 * Returns the audit log — full accountability trail of every action.
 * Supports pagination and filtering by action type.
 */
export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only officers can view audit log
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'officer') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    const targetType = searchParams.get('target_type')
    const limit = parseInt(searchParams.get('limit') || '50')

    let query = supabase
      .from('audit_log')
      .select(`
        id,
        action,
        target_type,
        target_id,
        details,
        created_at,
        profiles:actor_id (full_name, role)
      `)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (action) query = query.eq('action', action)
    if (targetType) query = query.eq('target_type', targetType)

    const { data, error } = await query

    if (error) {
      console.error('[audit] Query error:', error)
      return NextResponse.json({ error: 'Failed to fetch audit log' }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
