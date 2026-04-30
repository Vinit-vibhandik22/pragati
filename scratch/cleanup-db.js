const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function clearProfiles() {
  console.log('Clearing profiles and auth users...')
  
  // 1. Delete from profiles
  const { error: profErr } = await supabase.from('profiles').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  if (profErr) console.error('Error clearing profiles:', profErr.message)

  // 2. Delete from auth.users (just in case they are there)
  const { data: { users } } = await supabase.auth.admin.listUsers()
  for (const user of users) {
    if (user.email.includes('pragati.demo')) {
      await supabase.auth.admin.deleteUser(user.id)
    }
  }

  console.log('Database cleared of demo users. Now running seed...')
}

clearProfiles()
