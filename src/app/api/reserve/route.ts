import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { resend } from '@/lib/resend'

export async function POST(request: NextRequest) {
  try {
    console.log('Reserve API called')
    
    // Check if Supabase is configured
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      console.error('Supabase not configured')
      return NextResponse.json(
        { error: 'Supabase nicht konfiguriert' },
        { status: 500 }
      )
    }

    const { itemId, email } = await request.json()
    console.log('Request data:', { itemId, email })

    if (!itemId || !email) {
      console.error('Missing required fields')
      return NextResponse.json(
        { error: 'Item-ID und E-Mail sind erforderlich' },
        { status: 400 }
      )
    }

    // Get item details
    console.log('Fetching item from Supabase')
    const { data: item, error: itemError } = await supabase
      .from('wishlist_items')
      .select('*')
      .eq('id', itemId)
      .single()

    if (itemError || !item) {
      console.error('Item not found:', itemError)
      return NextResponse.json(
        { error: 'Item nicht gefunden' },
        { status: 404 }
      )
    }

    if (item.reserved) {
      console.error('Item already reserved')
      return NextResponse.json(
        { error: 'Item ist bereits reserviert' },
        { status: 400 }
      )
    }

    // Create reservation
    console.log('Creating reservation')
    const { error: reservationError } = await supabase
      .from('reservations')
      .insert([{
        item_id: itemId,
        email: email
      }])

    if (reservationError) {
      console.error('Error creating reservation:', reservationError)
      return NextResponse.json(
        { error: 'Fehler beim Erstellen der Reservierung' },
        { status: 500 }
      )
    }

    // Update item as reserved
    console.log('Updating item as reserved')
    const { error: updateError } = await supabase
      .from('wishlist_items')
      .update({
        reserved: true,
        reserved_by: email,
        reserved_at: new Date().toISOString()
      })
      .eq('id', itemId)

    if (updateError) {
      console.error('Error updating item:', updateError)
      return NextResponse.json(
        { error: 'Fehler beim Aktualisieren des Items' },
        { status: 500 }
      )
    }

    // Get from email from environment variable
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@ailiteracy.ch'
    console.log('From email:', fromEmail)

    // Send confirmation email to gifter
    try {
      console.log('Sending confirmation email to gifter')
      await resend.emails.send({
        from: `Baby-Wunschliste <${fromEmail}>`,
        to: [email],
        subject: `Bestätigung: ${item.item} reserviert`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #ec4899;">🎉 Vielen Dank für deine Reservierung!</h2>
            <p>Hallo!</p>
            <p>Vielen Dank, dass du <strong>${item.item}</strong> aus unserer Baby-Wunschliste reserviert hast.</p>
            
            <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0;">Details deiner Reservierung:</h3>
              <p><strong>Item:</strong> ${item.item}</p>
              ${item.size ? `<p><strong>Größe:</strong> ${item.size}</p>` : ''}
              ${item.color ? `<p><strong>Farbe:</strong> ${item.color}</p>` : ''}
              ${item.notes ? `<p><strong>Notizen:</strong> ${item.notes}</p>` : ''}
            </div>
            
            <p>Vielen Dank für deine Unterstützung!<br>
            Herzliche Grüße<br>
            Deine Baby-Eltern</p>
          </div>
        `
      })
      console.log('Confirmation email sent successfully')
    } catch (emailError) {
      console.error('Error sending confirmation email:', emailError)
      // Don't fail the reservation if email fails
    }

    // Send notification email(s) to parents from settings table (fallback to env)
    const parentEmails: string[] = []
    try {
      const { data, error } = await supabase.from('settings').select('parent_email_1,parent_email_2').eq('id',1).maybeSingle()
      if (error) throw error
      if (data?.parent_email_1) parentEmails.push(data.parent_email_1)
      if (data?.parent_email_2) parentEmails.push(data.parent_email_2)
    } catch {
      // fallback
      if (process.env.PARENT_EMAIL_1) parentEmails.push(process.env.PARENT_EMAIL_1)
      if (process.env.PARENT_EMAIL_2) parentEmails.push(process.env.PARENT_EMAIL_2 as string)
    }
    const uniqueParentEmails = Array.from(new Set(parentEmails.filter(Boolean)))
    if (uniqueParentEmails.length > 0) {
      try {
        console.log('Sending notification email to parents:', uniqueParentEmails)
        await resend.emails.send({
          from: `Baby-Wunschliste <${fromEmail}>`,
          to: uniqueParentEmails,
          subject: `Neue Reservierung: ${item.item}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #ec4899;">🎁 Neue Geschenk-Reservierung!</h2>
              <p>Hallo!</p>
              <p>Jemand hat ein Item aus eurer Baby-Wunschliste reserviert:</p>
              
              <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin-top: 0;">Reserviertes Item:</h3>
                <p><strong>Item:</strong> ${item.item}</p>
                ${item.size ? `<p><strong>Größe:</strong> ${item.size}</p>` : ''}
                ${item.color ? `<p><strong>Farbe:</strong> ${item.color}</p>` : ''}
                ${item.notes ? `<p><strong>Notizen:</strong> ${item.notes}</p>` : ''}
                <p><strong>Reserviert von:</strong> ${email}</p>
                <p><strong>Datum:</strong> ${new Date().toLocaleDateString('de-DE')}</p>
              </div>
              
              <p>Das Item wurde automatisch als reserviert markiert.</p>
            </div>
          `
        })
        console.log('Parent notification email sent successfully')
      } catch (emailError) {
        console.error('Error sending notification email:', emailError)
        // Don't fail the reservation if email fails
      }
    } else {
      console.log('No parent email configured')
    }

    console.log('Reservation completed successfully')
    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error in reserve API:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler'
    return NextResponse.json(
      { error: `Interner Server-Fehler: ${errorMessage}` },
      { status: 500 }
    )
  }
}
