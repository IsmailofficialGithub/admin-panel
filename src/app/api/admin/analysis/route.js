// src/app/api/admin/analysis/route.js
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request) {
  try {
    const supabase = await createClient()
    
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
      .from('analysis')
      .select(`
        *,
        brands:brand_id (
          name,
          niche
        ),
        user_search_queries:query_id (
          title,
          client_query
        ),
        profiles:created_by (
          full_name
        )
      `)
      .order('created_at', { ascending: false })

    // Filter by brand if provided
    if (brandId) {
      query = query.eq('brand_id', brandId)
    }

    const { data: analyses, error } = await query

    if (error) {
      console.error('Error fetching analysis:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ analyses })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}