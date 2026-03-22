'use client'
import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function BookingRedirectInner() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    let tenantId = searchParams.get('tenantId')
    let rescheduleBookingId = searchParams.get('rescheduleBookingId')
    if (!tenantId || !rescheduleBookingId) {
      const liffState = searchParams.get('liff.state')
      if (liffState) {
        const liffParams = new URLSearchParams(liffState.replace(/^\?/, ''))
        tenantId = tenantId || liffParams.get('tenantId')
        rescheduleBookingId = rescheduleBookingId || liffParams.get('rescheduleBookingId')
      }
    }
    if (tenantId && rescheduleBookingId) {
      router.replace(`/booking/${tenantId}/reschedule/${rescheduleBookingId}`)
      return
    }
    if (tenantId) {
      router.replace('/booking/' + tenantId)
    }
  }, [searchParams, router])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

export default function BookingRedirect() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" /></div>}>
      <BookingRedirectInner />
    </Suspense>
  )
}

