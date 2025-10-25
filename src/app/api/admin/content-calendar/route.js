// src/app/api/admin/content-calendar/route.js
import { createServerSupabaseClient } from '@/lib/supabase/Production/server'
import { NextResponse } from 'next/server'

export async function GET(request) {
  try {
    const supabase = await createServerSupabaseClient()
    
    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const brandId = searchParams.get('brand_id')

    // Build query
    let query = supabase
      .from('content_calendar')
      .select(`
        *,
        brands:brand_id (
          name,
          niche
        ),
        social_accounts:social_account_id (
          provider,
          handle
        ),
        analysis:analysis_id (
          title
        ),
        post_images (
          id,
          url,
          alt_text,
          position
        )
      `)
      .order('date', { ascending: false })
      .order('time', { ascending: false })

    // Filter by brand if provided
    if (brandId) {
      query = query.eq('brand_id', brandId)
    }

    const { data: posts, error } = await query

    if (error) {
      console.error('Error fetching content calendar:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ posts })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}