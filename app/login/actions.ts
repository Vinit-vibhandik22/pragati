'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function login(prevState: any, formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) {
    return { error: 'Email and password are required' }
  }

  // DEMO BYPASS FOR HACKATHON
  if (email === 'clerk@pragati.gov.in' && password === 'pragati2026') {
    redirect('/clerk/queue')
  }
  if (email === 'officer@pragati.gov.in' && password === 'pragati2026') {
    redirect('/tao/dashboard')
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return { error: error.message }
  }

  // Fetch role to determine redirect
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Authentication failed' }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const role = profile?.role || 'clerk'
  redirect(role === 'officer' ? '/tao/dashboard' : '/clerk/queue')
}

export async function signup(prevState: any, formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const fullName = formData.get('fullName') as string
  const role = formData.get('role') as string

  if (!email || !password || !fullName || !role) {
    return { error: 'All fields are required' }
  }

  if (!['clerk', 'officer'].includes(role)) {
    return { error: 'Invalid role' }
  }

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        role: role,
      },
    },
  })

  if (error) {
    return { error: error.message }
  }

  redirect(role === 'officer' ? '/officer' : '/clerk')
}

export async function signout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
