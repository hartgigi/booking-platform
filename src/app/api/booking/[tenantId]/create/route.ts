import { adminDb } from '@/lib/firebase/admin'
import { NextResponse } from 'next/server'
import admin from 'firebase-admin'
import { sendFlexMessage } from '@/lib/line/client'
import { buildBookingConfirmedMessage } from '@/lib/line/messages'
import type { Booking } from '@/types'

export async function POST(request: Request, { params }: { params: { tenantId: string } }) {
  try {
    const { tenantId } = params
    const body = await request.json()
    const { lineUserId, lineDisplayName, serviceId, staffId, date, time } = body

    if (!lineUserId || !serviceId || !date || !time) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    const serviceDoc = await adminDb.collection('services').doc(serviceId).get()
    if (!serviceDoc.exists) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 })
    }
    const service = serviceDoc.data()

    let staffName = ''
    if (staffId && staffId !== 'any') {
      const staffDoc = await adminDb.collection('staff').doc(staffId).get()
      if (staffDoc.exists) staffName = staffDoc.data()?.name || ''
    }

    const durationMinutes = service?.durationMinutes || 60
    const [h, m] = time.split(':').map(Number)
    const totalMin = h * 60 + m + durationMinutes
    const endTime = `${String(Math.floor(totalMin / 60) % 24).padStart(2, '0')}:${String(totalMin % 60).padStart(2, '0')}`

    const bookingRef = adminDb.collection('tenants').doc(tenantId).collection('bookings').doc()
    const booking: Omit<Booking, 'id'> = {
      tenantId,
      customerId: lineUserId,
      customerName: lineDisplayName || '',
      customerLineId: lineUserId,
      customerPhone: '',
      serviceId,
      serviceName: service?.name || '',
      staffId: staffId || 'any',
      staffName,
      date,
      startTime: time,
      endTime,
      status: 'confirmed',
      notes: '',
      price: service?.price,
      depositAmount: 0,
      depositStatus: 'none',
      depositPaidAt: null as any,
      depositChargeId: '',
      remainingAmount: service?.price || 0,
      remainingStatus: 'pending',
      remainingPaidAt: null as any,
      createdAt: admin.firestore.FieldValue.serverTimestamp() as any,
      updatedAt: admin.firestore.FieldValue.serverTimestamp() as any,
    }

    await bookingRef.set(booking)

    const tenantDoc = await adminDb.collection('tenants').doc(tenantId).get()
    const tenant = tenantDoc.exists ? tenantDoc.data() : null
    const adminLineUserId = tenant?.adminLineUserId
    if (adminLineUserId && tenant?.lineChannelAccessToken) {
      const notifyText = `🔔 จองคิวใหม่!\n━━━━━━━━━━━━━━\n👤 ลูกค้า: ${lineDisplayName || ''}\n💇 บริการ: ${service?.name || ''}\n📅 วันที่: ${date}\n⏰ เวลา: ${time} น.\n👤 ช่าง: ${staffName || 'ไม่ระบุ'}\n💰 ราคา: ฿${service?.price ?? 0}`
      try {
        await fetch('https://api.line.me/v2/bot/message/push', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + tenant.lineChannelAccessToken
          },
          body: JSON.stringify({
            to: adminLineUserId,
            messages: [{ type: 'text', text: notifyText }]
          })
        })
      } catch (err) {
        console.error('Failed to notify admin:', err)
      }
    }

    // Notify customer on LINE with booking details in rich card format
    try {
      const fullBooking: Booking = { ...(booking as Booking), id: bookingRef.id }
      const tenantName = (tenant?.name as string) || ''
      const flex = buildBookingConfirmedMessage(fullBooking, tenantName)
      await sendFlexMessage(tenantId, lineUserId, 'ยืนยันการจองแล้ว', flex)
    } catch (err) {
      console.error('Failed to notify customer:', err)
    }

    return NextResponse.json({ bookingId: bookingRef.id, booking })
  } catch (error) {
    console.error('Create booking error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
