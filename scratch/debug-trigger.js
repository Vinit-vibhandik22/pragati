const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function debugTrigger() {
  console.log('Attempting to create user manually to see DB error...')
  try {
    const { data, error } = await supabase.auth.admin.createUser({
      email: 'test@debug.demo',
      password: 'password123',
      email_confirm: true,
      user_metadata: { full_name: 'Debug User', role: 'clerk' }
    })
    
    if (error) {
      console.error('Auth Error:', error.message)
      if (error.message.includes('Database error')) {
        console.log('Confirmed: Trigger or Constraint is failing.')
      }
    } else {
      console.log('Success! User created:', data.user.id)
    }
  } catch (e) {
    console.error('Exception:', e.message)
  }
}

debugTrigger()
