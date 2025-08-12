import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    console.log('Test API called')
    
    // Check if Supabase is configured
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      console.error('Supabase not configured')
      return NextResponse.json(
        { error: 'Supabase nicht konfiguriert' },
        { status: 500 }
      )
    }

    // Test connection by fetching wishlist items
    console.log('Testing Supabase connection...')
    const { data, error } = await supabase
      .from('wishlist_items')
      .select('*')
      .limit(1)

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json(
        { error: `Supabase Fehler: ${error.message}` },
        { status: 500 }
      )
    }

    console.log('Supabase connection successful')
    return NextResponse.json({ 
      success: true, 
      message: 'Supabase-Verbindung erfolgreich',
      itemsCount: data?.length || 0
    })

  } catch (error) {
    console.error('Error in test API:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler'
    return NextResponse.json(
      { error: `Test-Fehler: ${errorMessage}` },
      { status: 500 }
    )
  }
}
