import BookingClient from './BookingClient'

async function getBookingData(tenantId: string) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
  const res = await fetch(baseUrl + '/api/booking/' + tenantId, {
    cache: 'no-store',
  })
  if (!res.ok) return null
  return res.json()
}

export default async function BookingPage({ params }: { params: { tenantId: string } }) {
  const { tenantId } = params
  const data = await getBookingData(tenantId)

  if (!data || !data.tenant) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-6">
        <p className="text-gray-500">ไม่พบร้านที่ต้องการจอง</p>
      </div>
    )
  }

  return (
    <BookingClient
      tenantId={tenantId}
      initialTenant={data.tenant}
      initialServices={data.services || []}
      initialStaff={data.staff || []}
    />
  )
}

