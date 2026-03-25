'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import liff from '@line/liff'
import { JONGME_LIFF_ID } from '@/lib/line/liff'
import { db } from '@/lib/firebase/client'
import type { Booking, BookingStatus } from '@/types'
import {
  collection,
  onSnapshot,
  query,
  where,
} from 'firebase/firestore'
import { Calendar, ArrowLeft } from 'lucide-react'

type TabKey = 'upcoming' | 'history' | 'all'

function statusLabel(status: BookingStatus): string {
  switch (status) {
    case 'open':
      return 'รอยืนยัน'
    case 'confirmed':
      return 'ยืนยันแล้ว'
    case 'completed':
      return 'เสร็จสิ้น'
    case 'user_cancelled':
      return 'ยกเลิก (ลูกค้า)'
    case 'admin_cancelled':
      return 'ยกเลิก (ร้าน)'
    default:
      return status
  }
}

function statusPillClass(status: BookingStatus): string {
  switch (status) {
    case 'open':
      return 'bg-amber-100 text-amber-700'
    case 'confirmed':
      return 'bg-emerald-100 text-emerald-700'
    case 'completed':
      return 'bg-blue-100 text-blue-700'
    case 'user_cancelled':
    case 'admin_cancelled':
      return 'bg-slate-100 text-slate-600'
    default:
      return 'bg-slate-100 text-slate-600'
  }
}

function toBooking(id: string, data: any, tenantId: string): Booking {
  return {
    id,
    tenantId,
    customerId: data.customerId as string,
    customerName: data.customerName as string,
    customerLineId: data.customerLineId as string,
    customerPhone: (data.customerPhone as string) ?? '',
    serviceId: data.serviceId as string,
    serviceName: data.serviceName as string,
    staffId: data.staffId as string,
    staffName: data.staffName as string,
    date: data.date as string,
    startTime: data.startTime as string,
    endTime: (data.endTime as string) ?? (data.startTime as string),
    status: data.status as BookingStatus,
    notes: (data.notes as string) ?? '',
    price: data.price as number | undefined,
    depositAmount: (data.depositAmount as number) ?? 0,
    depositStatus: (data.depositStatus as Booking['depositStatus']) ?? 'none',
    depositPaidAt: (data.depositPaidAt as any) ?? null,
    depositChargeId: (data.depositChargeId as string) ?? '',
    remainingAmount: (data.remainingAmount as number) ?? 0,
    remainingPaidAt: (data.remainingPaidAt as any) ?? null,
    remainingStatus: (data.remainingStatus as Booking['remainingStatus']) ?? 'pending',
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  }
}

export default function MyBookingsPage({ params }: { params: { tenantId: string } }) {
  const router = useRouter()
  const { tenantId } = params

  const [lineUserId, setLineUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<TabKey>('upcoming')
  const [bookings, setBookings] = useState<Booking[]>([])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        await liff.init({ liffId: JONGME_LIFF_ID, withLoginOnExternalBrowser: false })
        if (!liff.isLoggedIn()) {
          if (!cancelled) setLineUserId(null)
          return
        }
        const profile = await liff.getProfile()
        if (!cancelled) setLineUserId(profile.userId)
      } catch {
        if (!cancelled) setLineUserId(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!lineUserId) return
    const q = query(
      collection(db, 'tenants', tenantId, 'bookings'),
      where('customerLineId', '==', lineUserId)
    )

    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => toBooking(d.id, d.data(), tenantId))
      // เรียงตามวันที่/เวลา (client-side) เพื่อไม่ผูก index เพิ่ม
      list.sort((a, b) => {
        const dateCmp = b.date.localeCompare(a.date)
        if (dateCmp !== 0) return dateCmp
        return a.startTime.localeCompare(b.startTime)
      })
      setBookings(list)
    })

    return () => unsub()
  }, [lineUserId, tenantId])

  const filtered = useMemo(() => {
    if (tab === 'all') return bookings
    if (tab === 'upcoming') {
      return bookings.filter((b) => b.status === 'open' || b.status === 'confirmed')
    }
    // history
    return bookings.filter((b) => b.status !== 'open' && b.status !== 'confirmed')
  }, [bookings, tab])

  const showEmpty = !loading && filtered.length === 0

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-10 bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 transition-colors"
          aria-label="ย้อนกลับ"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <div className="text-base font-semibold text-slate-900">รายการจองของฉัน</div>
          <div className="text-xs text-slate-500 mt-0.5">ดูรายการที่จองไปแล้ว และประวัติการจอง</div>
        </div>
      </header>

      <div className="px-4 pt-4 pb-24">
        {!loading && !lineUserId && (
          <div className="rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm p-4 mb-4">
            กรุณาเปิดหน้านี้จาก LINE ที่ล็อกอินอยู่ก่อน เพื่อให้ระบบดึงประวัติการจองได้
          </div>
        )}

        <div className="flex gap-2 mb-4">
          <button
            type="button"
            onClick={() => setTab('upcoming')}
            className={`px-3 py-2 rounded-xl text-sm font-medium border transition-colors ${
              tab === 'upcoming' ? 'bg-teal-50 border-teal-400 text-teal-800' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            กำลังจะมา
          </button>
          <button
            type="button"
            onClick={() => setTab('history')}
            className={`px-3 py-2 rounded-xl text-sm font-medium border transition-colors ${
              tab === 'history' ? 'bg-teal-50 border-teal-400 text-teal-800' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            ประวัติ
          </button>
          <button
            type="button"
            onClick={() => setTab('all')}
            className={`px-3 py-2 rounded-xl text-sm font-medium border transition-colors ${
              tab === 'all' ? 'bg-teal-50 border-teal-400 text-teal-800' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            ทั้งหมด
          </button>
        </div>

        {loading && (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-20 bg-white rounded-xl border border-slate-200 animate-pulse" />
            ))}
          </div>
        )}

        {showEmpty && (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-teal-100 mb-4">
              <Calendar className="w-6 h-6 text-teal-700" />
            </div>
            <div className="font-semibold text-slate-900">ยังไม่มีรายการจอง</div>
            <div className="text-sm text-slate-500 mt-2">ลองกด “จองคิวเพิ่ม” เพื่อเริ่มจองใหม่</div>
          </div>
        )}

        {!loading &&
          filtered.map((b) => (
            <div key={b.id} className="bg-white border border-slate-200 rounded-2xl p-4 mb-3 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm text-slate-500">{b.date} · {b.startTime}</div>
                  <div className="text-base font-semibold text-slate-900 mt-1">{b.serviceName}</div>
                  <div className="text-sm text-slate-600 mt-1">ช่าง: {b.staffName || 'ไม่ระบุ'}</div>
                </div>
                <span className={`px-3 py-1 rounded-xl text-xs font-medium ${statusPillClass(b.status)}`}>
                  {statusLabel(b.status)}
                </span>
              </div>
              {typeof b.price === 'number' && b.price > 0 && (
                <div className="text-sm text-slate-600 mt-3">ยอดประมาณ: ฿{b.price.toLocaleString()}</div>
              )}
            </div>
          ))}
      </div>

      <div className="fixed left-0 right-0 bottom-0 bg-white border-t border-slate-200 p-4">
        <button
          type="button"
          onClick={() => router.push(`/booking/${tenantId}`)}
          className="w-full rounded-xl bg-teal-600 text-white py-3 font-semibold hover:bg-teal-700 transition-colors"
        >
          จองคิวเพิ่ม
        </button>
      </div>
    </div>
  )
}

