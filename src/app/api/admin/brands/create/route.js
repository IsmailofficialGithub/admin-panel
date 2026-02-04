// src/app/api/admin/brands/create/route.js
import { createServerSupabaseClient } from '@/lib/supabase/Production/server'
import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const supabase = await createServerSupabaseClient()
    
    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, website_url, niche, target_market, timezone, brand_colors, logo } = body

    // Validate required fields
    if (!name) {
      return NextResponse.json({ error: 'Brand name is required' }, { status: 400 })
    }

    // Create brand
    const { data: brand, error } = await supabase
      .from('brands')
      .insert({
        owner_user_id: user.id,
        name,
        website_url,
        niche,
        target_market,
        timezone: timezone || 'UTC',
        brand_colors,
        logo
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating brand:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ brand }, { status: 201 })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}