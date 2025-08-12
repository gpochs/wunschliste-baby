import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { resend } from '@/lib/resend'

export async function POST(request: NextRequest) {
  try {
    // Check if Supabase is configured
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      return NextResponse.json(
        { error: 'Supabase nicht konfiguriert' },
        { status: 500 }
      )
    }

    const { itemId, email } = await request.json()

    if (!itemId || !email) {
      return NextResponse.json(
        { error: 'Item-ID und E-Mail sind erforderlich' },
        { status: 400 }
      )
    }

    // Get item details
    const { data: item, error: itemError } = await supabase
      .from('wishlist_items')
      .select('*')
      .eq('id', itemId)
      .single()

    if (itemError || !item) {
      return NextResponse.json(
        { error: 'Item nicht gefunden' },
        { status: 404 }
      )
    }

    if (item.reserved) {
      return NextResponse.json(
        { error: 'Item ist bereits reserviert' },
        { status: 400 }
      )
    }

    // Create reservation
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

    // Send confirmation email to gifter
    try {
      await resend.emails.send({
        from: `Baby-Wunschliste <${fromEmail}>`,
        to: [email],
        subject: `Bestätigung: ${item.item} reserviert`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #ec4899;">🎉 Vielen Dank für Ihre Reservierung!</h2>
            <p>Hallo!</p>
            <p>Vielen Dank, dass Sie <strong>${item.item}</strong> aus unserer Baby-Wunschliste reserviert haben.</p>
            
            <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0;">Details Ihrer Reservierung:</h3>
              <p><strong>Item:</strong> ${item.item}</p>
              ${item.size ? `<p><strong>Größe:</strong> ${item.size}</p>` : ''}
              ${item.color ? `<p><strong>Farbe:</strong> ${item.color}</p>` : ''}
              ${item.notes ? `<p><strong>Notizen:</strong> ${item.notes}</p>` : ''}
            </div>
            
            <p>Wir werden Sie über den weiteren Ablauf informieren. Bei Fragen können Sie sich gerne an uns wenden.</p>
            
            <p>Vielen Dank für Ihre Unterstützung!<br>
            Herzliche Grüße<br>
            Ihre Baby-Eltern</p>
          </div>
        `
      })
    } catch (emailError) {
      console.error('Error sending confirmation email:', emailError)
      // Don't fail the reservation if email fails
    }

    // Send notification email to parent (using PARENT_EMAIL_1)
    const parentEmail = process.env.PARENT_EMAIL_1
    if (parentEmail) {
      try {
        await resend.emails.send({
          from: `Baby-Wunschliste <${fromEmail}>`,
          to: [parentEmail],
          subject: `Neue Reservierung: ${item.item}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #ec4899;">🎁 Neue Geschenk-Reservierung!</h2>
              <p>Hallo!</p>
              <p>Jemand hat ein Item aus Ihrer Baby-Wunschliste reserviert:</p>
              
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
      } catch (emailError) {
        console.error('Error sending notification email:', emailError)
        // Don't fail the reservation if email fails
      }
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error in reserve API:', error)
    return NextResponse.json(
      { error: 'Interner Server-Fehler' },
      { status: 500 }
    )
  }
}
