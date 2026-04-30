const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function resetUsers() {
  console.log('Fetching users...')
  const { data: { users }, error } = await supabase.auth.admin.listUsers()
  
  if (error) {
    console.error('Error listing users:', error.message)
    return
  }

  for (const user of users) {
    if (user.email === 'clerk@pragati.demo' || user.email === 'officer@pragati.demo') {
      console.log(`Deleting existing user: ${user.email}`)
      await supabase.auth.admin.deleteUser(user.id)
    }
  }
  
  console.log('Reset complete. You can now run the seed script again.')
}

resetUsers()
