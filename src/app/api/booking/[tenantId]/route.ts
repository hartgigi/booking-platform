import { adminDb } from '@/lib/firebase/admin'
import { NextResponse } from 'next/server'

export async function GET(request: Request, { params }: { params: { tenantId: string } }) {
  try {
    const { tenantId } = params

    const tenantDoc = await adminDb.collection('tenants').doc(tenantId).get()
    if (!tenantDoc.exists) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }
    const tenant = tenantDoc.data()

    const servicesSnap = await adminDb.collection('services')
      .where('tenantId', '==', tenantId)
      .where('isActive', '==', true)
      .get()
    const services = servicesSnap.docs.map(d => ({ id: d.id, ...d.data() }))

    const staffSnap = await adminDb.collection('staff')
      .where('tenantId', '==', tenantId)
      .where('isActive', '==', true)
      .get()
    const staff = staffSnap.docs.map(d => ({ id: d.id, ...d.data() }))

    return NextResponse.json({
      tenant: {
        id: tenantId,
        name: tenant?.name,
        businessType: tenant?.businessType,
        depositMode: tenant?.depositMode || 'manual',
        bankName: tenant?.bankName || '',
        bankAccountNumber: tenant?.bankAccountNumber || '',
        bankAccountName: tenant?.bankAccountName || '',
        promptPayNumber: tenant?.promptPayNumber || '',
        openTime: tenant?.openTime || '09:00',
        closeTime: tenant?.closeTime || '20:00',
        openDays: tenant?.openDays || [1, 2, 3, 4, 5, 6],
        logoUrl: tenant?.logoUrl || '',
        coverImageUrl: tenant?.coverImageUrl || '',
        phone: tenant?.phone || '',
        address: tenant?.address || '',
        lineId: tenant?.lineId || tenant?.lineOaId || '',
      },
      services,
      staff,
    })
  } catch (error) {
    console.error('Booking API error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
