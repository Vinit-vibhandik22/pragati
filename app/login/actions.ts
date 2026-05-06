'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'

export async function login(prevState: any, formData: FormData) {
  const supabase = await createClient()
  const cookieStore = await cookies()

  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) {
    return { error: 'Email and password are required' }
  }

  // DEMO BYPASS FOR HACKATHON
  const isBypass = (
    (email === 'farmer@pragati.gov.in' && password === 'pragati2026') ||
    (email === 'clerk@pragati.gov.in' && password === 'pragati2026') ||
    (email === 'officer@pragati.gov.in' && password === 'pragati2026') ||
    (email === 'tao@pragati.gov.in' && password === 'pragati2026')
  )

  if (isBypass) {
    cookieStore.set('pragati_demo_session', 'true', { 
      path: '/', 
      maxAge: 60 * 60 * 24, // 24 hours
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    })

    if (email === 'farmer@pragati.gov.in') redirect('/farmer/apply')
    if (email === 'clerk@pragati.gov.in') redirect('/clerk/queue')
    if (email === 'officer@pragati.gov.in') redirect('/officer')
    if (email === 'tao@pragati.gov.in') redirect('/tao/dashboard')
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
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const role = profile?.role || 'krushi_sahayak'
  
  if (role === 'farmer') {
    redirect('/farmer/dashboard/profile')
  } else if (role === 'krushi_sahayak') {
    redirect('/ks/dashboard')
  } else if (role === 'talathi') {
    redirect('/talathi/dashboard')
  } else if (role === 'gram_sevak') {
    redirect('/gs/dashboard')
  } else if (role === 'tao') {
    redirect('/tao/dashboard')
  } else {
    redirect('/')
  }
}

export async function signup(prevState: any, formData: FormData) {
  const supabase = await createClient()
  const cookieStore = await cookies()

  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const fullName = formData.get('fullName') as string
  const role = formData.get('role') as string

  if (!email || !password || !fullName || !role) {
    return { error: 'All fields are required' }
  }

  const validRoles = ['farmer', 'krushi_sahayak', 'talathi', 'gram_sevak', 'tao'];
  if (!validRoles.includes(role)) {
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

  if (role === 'farmer') {
    cookieStore.set('pragati_demo_session', 'true', { 
      path: '/', 
      maxAge: 60 * 60 * 24, 
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    })
    redirect('/farmer/dashboard/profile')
  } else if (role === 'krushi_sahayak') {
    redirect('/ks/dashboard')
  } else if (role === 'talathi') {
    redirect('/talathi/dashboard')
  } else if (role === 'gram_sevak') {
    redirect('/gs/dashboard')
  } else if (role === 'tao') {
    redirect('/tao/dashboard')
  } else {
    redirect('/')
  }
}

export async function signout() {
  const supabase = await createClient()
  const cookieStore = await cookies()
  
  await supabase.auth.signOut()
  cookieStore.delete('pragati_demo_session')
  
  redirect('/login/official')
}
