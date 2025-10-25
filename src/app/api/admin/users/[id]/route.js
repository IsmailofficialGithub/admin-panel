import { createAdminClient } from '@/lib/supabase/Production/admin'
import { createServerSupabaseClient } from '@/lib/supabase/Production/server'
import { NextResponse } from 'next/server'

export async function DELETE(request, { params }) {
  try {
    const supabase = await createServerSupabaseClient()
    const { id } = await params
    
    // Check if current user is admin
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })
    }

    // Delete user using admin client
    const adminClient = createAdminClient()
    
    const { error } = await adminClient.auth.admin.deleteUser(id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true, message: 'User deleted successfully' })

  } catch (error) {
    console.error('Error deleting user:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}