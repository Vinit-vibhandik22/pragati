const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function check() {
  const { data: { users } } = await supabase.auth.admin.listUsers()
  console.log('Total users in Auth:', users.length)
  users.forEach(u => console.log(' - ', u.email))
  
  const { data: profiles } = await supabase.from('profiles').select('id, full_name, role')
  console.log('Total profiles:', profiles?.length)
  profiles?.forEach(p => console.log(' - ', p.id, p.role))
}

check()
