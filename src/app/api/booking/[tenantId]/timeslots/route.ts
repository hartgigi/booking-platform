import { adminDb } from '@/lib/firebase/admin'
import { NextResponse } from 'next/server'

export async function GET(request: Request, { params }: { params: { tenantId: string } }) {
  try {
    const { tenantId } = params
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')
    const staffId = searchParams.get('staffId')
    const serviceId = searchParams.get('serviceId')

    if (!date || !serviceId) {
      return NextResponse.json({ error: 'Missing date or serviceId' }, { status: 400 })
    }

    const tenantDoc = await adminDb.collection('tenants').doc(tenantId).get()
    const tenant = tenantDoc.data()
    const openTime = tenant?.openTime || '09:00'
    const closeTime = tenant?.closeTime || '20:00'

    const serviceDoc = await adminDb.collection('services').doc(serviceId).get()
    const duration = serviceDoc.data()?.durationMinutes || 60

    let bookingsQuery = adminDb.collection('tenants').doc(tenantId).collection('bookings')
      .where('date', '==', date)
      .where('status', 'in', ['open', 'confirmed'])

    if (staffId && staffId !== 'any') {
      bookingsQuery = bookingsQuery.where('staffId', '==', staffId)
    }

    const bookingsSnap = await bookingsQuery.get()
    const existingBookings = bookingsSnap.docs.map(d => d.data())

    const [openH, openM] = openTime.split(':').map(Number)
    const [closeH, closeM] = closeTime.split(':').map(Number)
    const startMin = openH * 60 + openM
    const endMin = closeH * 60 + closeM

    const now = new Date()
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    const currentMin = now.getHours() * 60 + now.getMinutes()

    const slots = []
    for (let min = startMin; min + duration <= endMin; min += 60) {
      const h = Math.floor(min / 60)
      const m = min % 60
      const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`

      let available = true

      if (date === todayStr && min <= currentMin) {
        available = false
      }

      for (const b of existingBookings) {
        const [bh, bm] = (b.startTime || '00:00').split(':').map(Number)
        const [eh, em] = (b.endTime || '00:00').split(':').map(Number)
        const bStart = bh * 60 + bm
        const bEnd = eh * 60 + em
        if (min < bEnd && min + duration > bStart) {
          available = false
          break
        }
      }

      slots.push({ time: timeStr, available })
    }

    return NextResponse.json({ slots })
  } catch (error) {
    console.error('Timeslots error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
