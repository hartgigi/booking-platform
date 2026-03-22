'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { JONGME_LIFF_ID, buildLiffReturnToStartUrl } from '@/lib/line/liff'

interface ReschedulePageProps {
  params: { tenantId: string; bookingId: string }
}

interface BookingSummary {
  id: string
  serviceName: string
  staffName: string
  serviceId: string
  staffId: string
  date: string
  startTime: string
  tenantId: string
}

interface TimeSlot {
  time: string
  available: boolean
}

const styles = {
  page: {
    minHeight: '100vh',
    backgroundColor: '#F9FAFB',
    fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
  } as React.CSSProperties,
  header: {
    padding: '16px 16px 8px',
    textAlign: 'center' as const,
  },
  title: {
    fontSize: 18,
    fontWeight: 700,
    color: '#111827',
  },
  subtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
  },
  card: {
    margin: '8px 16px 16px',
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
    border: '1px solid #E5E7EB',
    overflow: 'hidden',
  } as React.CSSProperties,
  cardHeader: {
    padding: '12px 16px',
    background: 'linear-gradient(135deg,#0D9488,#14B8A6)',
    color: '#FFFFFF',
  },
  cardBody: {
    padding: '12px 16px 16px',
  },
  row: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 13,
    marginBottom: 6,
  } as React.CSSProperties,
  label: {
    color: '#9CA3AF',
  },
  value: {
    color: '#111827',
    fontWeight: 500,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 600,
    color: '#374151',
    margin: '0 16px 8px',
  },
  datesRow: {
    display: 'flex',
    gap: 8,
    overflowX: 'auto' as const,
    padding: '0 16px 16px',
    margin: '0 -16px',
  },
  dateChip: (selected: boolean) =>
    ({
      flexShrink: 0,
      width: 72,
      padding: '10px 0',
      borderRadius: 16,
      textAlign: 'center',
      backgroundColor: selected ? '#0D9488' : '#FFFFFF',
      color: selected ? '#FFFFFF' : '#4B5563',
      border: selected ? 'none' : '1px solid #E5E7EB',
      cursor: 'pointer',
      boxShadow: selected ? '0 4px 10px rgba(13,148,136,0.3)' : 'none',
    } as React.CSSProperties),
  dateChipDay: (selected: boolean) =>
    ({
      fontSize: 11,
      color: selected ? '#CCFBF1' : '#9CA3AF',
    } as React.CSSProperties),
  dateChipNum: {
    fontSize: 18,
    fontWeight: 700,
  } as React.CSSProperties,
  timeGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 8,
    padding: '0 16px 16px',
  } as React.CSSProperties,
  timeSlot: (selected: boolean) =>
    ({
      padding: '10px 0',
      borderRadius: 12,
      border: selected ? 'none' : '1px solid #E5E7EB',
      backgroundColor: selected ? '#0D9488' : '#FFFFFF',
      color: selected ? '#FFFFFF' : '#374151',
      fontSize: 14,
      fontWeight: 500,
      textAlign: 'center',
      cursor: 'pointer',
      boxShadow: selected ? '0 4px 10px rgba(13,148,136,0.3)' : 'none',
    } as React.CSSProperties),
  bottomBar: {
    position: 'fixed' as const,
    left: 0,
    right: 0,
    bottom: 0,
    padding: '12px 16px 20px',
    backgroundColor: '#FFFFFF',
    borderTop: '1px solid #E5E7EB',
  },
  button: (disabled: boolean) =>
    ({
      width: '100%',
      padding: '14px',
      borderRadius: 999,
      border: 'none',
      fontSize: 16,
      fontWeight: 600,
      color: disabled ? '#9CA3AF' : '#FFFFFF',
      backgroundColor: disabled ? '#E5E7EB' : '#0D9488',
      cursor: disabled ? 'not-allowed' : 'pointer',
    } as React.CSSProperties),
  message: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center' as const,
    marginTop: 8,
  },
}

export default function ReschedulePage({ params }: ReschedulePageProps) {
  const { tenantId, bookingId } = params
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [booking, setBooking] = useState<BookingSummary | null>(null)
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [selectedTime, setSelectedTime] = useState<string>('')
  const [slots, setSlots] = useState<TimeSlot[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [lineUserId, setLineUserId] = useState<string | null>(null)
  const datetimeSectionRef = useRef<HTMLDivElement>(null)

  /** รวมวันที่จองเดิมกับช่วงวันถัดจากวันนี้ เพื่อให้เลือกเลื่อนได้แม้นัดไม่อยู่ใน 7 วันแรก */
  const buildRescheduleDateChips = useCallback((bookingDate: string) => {
    const dayNames = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส']
    const monthNames = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']
    const seen = new Set<string>()
    const dates: { dateStr: string; dayName: string; dayNum: number; monthName: string }[] = []

    const pushDate = (d: Date) => {
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      if (seen.has(dateStr)) return
      seen.add(dateStr)
      dates.push({
        dateStr,
        dayName: dayNames[d.getDay()],
        dayNum: d.getDate(),
        monthName: monthNames[d.getMonth()],
      })
    }

    if (bookingDate && /^\d{4}-\d{2}-\d{2}$/.test(bookingDate)) {
      const [y, m, day] = bookingDate.split('-').map(Number)
      const bd = new Date(y, m - 1, day)
      if (!Number.isNaN(bd.getTime())) pushDate(bd)
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    for (let i = 0; i < 14; i++) {
      const d = new Date(today)
      d.setDate(d.getDate() + i)
      pushDate(d)
    }

    dates.sort((a, b) => a.dateStr.localeCompare(b.dateStr))
    return dates
  }, [])

  // โหลด LINE profile เพื่อเอา lineUserId
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const { default: liff } = await import('@line/liff')
        if (!(liff as any).isInitialized?.()) {
          await liff.init({ liffId: JONGME_LIFF_ID })
        }
        if (!liff.isLoggedIn()) {
          liff.login({
            redirectUri: buildLiffReturnToStartUrl({
              tenantId,
              rescheduleBookingId: bookingId,
            }),
          })
          return
        }
        const profile = await liff.getProfile()
        if (!cancelled && profile?.userId) {
          setLineUserId(profile.userId)
        }
      } catch (err) {
        console.error('Reschedule LIFF error:', err)
        if (!cancelled) setError('ไม่สามารถโหลดข้อมูลผู้ใช้จาก LINE ได้')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [tenantId, bookingId])

  // โหลดรายละเอียดการจองเดิม
  useEffect(() => {
    if (!lineUserId) return
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        const res = await fetch(
          `/api/customer/${tenantId}/bookings/${bookingId}?lineUserId=${encodeURIComponent(lineUserId)}`,
        )
        const data = await res.json()
        if (cancelled) return
        if (!res.ok) {
          setError(data?.error || 'ไม่พบข้อมูลการจอง')
          setLoading(false)
          return
        }
        const b = data.booking as any
        setBooking({
          id: b.id,
          serviceName: b.serviceName,
          staffName: b.staffName,
          serviceId: b.serviceId,
          staffId: b.staffId,
          date: b.date,
          startTime: b.startTime,
          tenantId: b.tenantId,
        })
        setSelectedDate(b.date)
        setSelectedTime('')
        setError(null)
      } catch (err) {
        console.error(err)
        if (!cancelled) setError('เกิดข้อผิดพลาดในการโหลดข้อมูลการจอง')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [tenantId, bookingId, lineUserId])

  // เลื่อนไปส่วนเลือกวัน/เวลาเมื่อโหลดการจองแล้ว (กรณีเปิดจาก LINE)
  useEffect(() => {
    if (!booking || loading) return
    const t = window.setTimeout(() => {
      datetimeSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 100)
    return () => window.clearTimeout(t)
  }, [booking, loading])

  // โหลดเวลาว่างเมื่อเปลี่ยนวันที่ — ถ้าเป็นวันเดิม ให้เลือกเวลาเดิมเป็นค่าเริ่มต้นเมื่อช่องว่าง
  useEffect(() => {
    if (!booking || !selectedDate) return
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(
          `/api/booking/${booking.tenantId}/timeslots?date=${encodeURIComponent(
            selectedDate,
          )}&staffId=${encodeURIComponent(
            booking.staffId || 'any',
          )}&serviceId=${encodeURIComponent(booking.serviceId)}`,
        )
        const data = await res.json()
        if (cancelled) return
        const list = (data.slots || []) as TimeSlot[]
        setSlots(list)
        if (selectedDate === booking.date && booking.startTime) {
          const originalOk = list.some((s) => s.time === booking.startTime && s.available)
          if (originalOk) setSelectedTime(booking.startTime)
        }
      } catch {
        if (!cancelled) setSlots([])
      }
    })()
    return () => {
      cancelled = true
    }
  }, [booking, selectedDate])

  const handleConfirm = async () => {
    if (!booking || !selectedDate || !selectedTime || !lineUserId) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/customer/${tenantId}/reschedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: booking.id,
          newDate: selectedDate,
          newTime: selectedTime,
          lineUserId,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data?.error || 'ไม่สามารถเลื่อนนัดได้')
        return
      }
      setSuccess(true)
    } catch (err) {
      console.error(err)
      setError('เกิดข้อผิดพลาด ไม่สามารถเลื่อนนัดได้')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading && !booking) {
    return (
      <div style={{ ...styles.page, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ fontSize: 14, color: '#6B7280' }}>กำลังโหลดข้อมูลการจอง...</p>
      </div>
    )
  }

  if (error && !booking) {
    return (
      <div style={{ ...styles.page, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 24px' }}>
        <p style={{ fontSize: 14, color: '#EF4444', textAlign: 'center' }}>{error}</p>
      </div>
    )
  }

  if (!booking) {
    return null
  }

  const dateChips = buildRescheduleDateChips(booking.date)
  const disableConfirm = !selectedDate || !selectedTime || submitting || success

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <h1 style={styles.title}>เลื่อนนัดหมาย</h1>
        <p style={styles.subtitle}>เลือกวันและเวลาใหม่สำหรับการจองของคุณ</p>
      </header>

      <section style={styles.card}>
        <div style={styles.cardHeader}>
          <p style={{ fontSize: 13, opacity: 0.9, marginBottom: 4 }}>บริการ</p>
          <p style={{ fontSize: 17, fontWeight: 700 }}>{booking.serviceName}</p>
        </div>
        <div style={styles.cardBody}>
          <div style={styles.row}>
            <span style={styles.label}>ช่าง</span>
            <span style={styles.value}>{booking.staffName || 'ไม่ระบุ'}</span>
          </div>
          <div style={styles.row}>
            <span style={styles.label}>วันที่เดิม</span>
            <span style={styles.value}>{booking.date}</span>
          </div>
          <div style={styles.row}>
            <span style={styles.label}>เวลาเดิม</span>
            <span style={styles.value}>{booking.startTime} น.</span>
          </div>
        </div>
      </section>

      <div ref={datetimeSectionRef}>
      <h2 style={styles.sectionTitle}>เลือกวันใหม่</h2>
      <div style={styles.datesRow}>
        {dateChips.map((d) => (
          <button
            key={d.dateStr}
            type="button"
            onClick={() => {
              setSelectedDate(d.dateStr)
              setSelectedTime('')
            }}
            style={styles.dateChip(selectedDate === d.dateStr)}
          >
            <p style={styles.dateChipDay(selectedDate === d.dateStr)}>{d.dayName}</p>
            <p style={styles.dateChipNum}>{d.dayNum}</p>
            <p style={styles.dateChipDay(selectedDate === d.dateStr)}>{d.monthName}</p>
          </button>
        ))}
      </div>

      {selectedDate && (
        <>
          <h2 style={styles.sectionTitle}>เลือกเวลาใหม่</h2>
          <div style={styles.timeGrid}>
            {slots.length === 0 ? (
              <p style={{ gridColumn: '1 / -1', fontSize: 13, color: '#9CA3AF', textAlign: 'center' }}>
                กำลังโหลดเวลาว่าง...
              </p>
            ) : (
              slots.map((slot) => (
                <button
                  key={slot.time}
                  type="button"
                  disabled={!slot.available}
                  onClick={() => slot.available && setSelectedTime(slot.time)}
                  style={styles.timeSlot(selectedTime === slot.time)}
                >
                  {slot.time}
                </button>
              ))
            )}
          </div>
        </>
      )}

      </div>

      <div style={{ height: 96 }} />

      <div style={styles.bottomBar}>
        <button type="button" disabled={disableConfirm} style={styles.button(disableConfirm)} onClick={handleConfirm}>
          {success ? 'เลื่อนนัดสำเร็จแล้ว' : 'ยืนยันการเลื่อนนัด'}
        </button>
        {error && <p style={styles.message}>{error}</p>}
        {success && !error && (
          <p style={styles.message}>ระบบได้เลื่อนนัดของคุณแล้ว และแจ้งร้านค้าเรียบร้อย</p>
        )}
      </div>
    </div>
  )
}

