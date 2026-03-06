import { adminDb } from '@/lib/firebase/admin'
import { NextResponse } from 'next/server'
import admin from 'firebase-admin'

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
    const booking = {
      tenantId,
      customerId: lineUserId,
      customerLineId: lineUserId,
      customerName: lineDisplayName || '',
      serviceId,
      serviceName: service?.name || '',
      staffId: staffId || 'any',
      staffName,
      date,
      startTime: time,
      endTime,
      status: 'confirmed',
      depositAmount: 0,
      depositStatus: 'none',
      remainingAmount: service?.price || 0,
      remainingStatus: 'pending',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }

    await bookingRef.set(booking)

    return NextResponse.json({ bookingId: bookingRef.id, booking })
  } catch (error) {
    console.error('Create booking error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
