'use client'

import { useState, useEffect, useCallback } from 'react'

interface Service {
  id: string; name: string; price: number; durationMinutes: number;
  depositAmount: number; description?: string; imageUrl?: string;
}
interface Staff {
  id: string; name: string; imageUrl?: string; serviceIds: string[];
}
interface TimeSlot {
  time: string; available: boolean;
}
interface TenantInfo {
  id: string; name: string; businessType: string; depositMode: string;
  bankName: string; bankAccountNumber: string; bankAccountName: string;
  promptPayNumber: string; openTime: string; closeTime: string; logoUrl: string;
}

interface BookingClientProps {
  tenantId: string
  initialTenant: any
  initialServices: any[]
  initialStaff: any[]
}

const styles = {
  page: { minHeight: '100vh', backgroundColor: '#F9FAFB', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' },
  header: { position: 'sticky' as const, top: 0, zIndex: 50, backgroundColor: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', padding: '12px 16px' },
  headerTitle: { fontWeight: 'bold', fontSize: '18px', color: '#1F2937', textAlign: 'center' as const },
  headerSubtitle: { fontSize: '12px', color: '#9CA3AF', textAlign: 'center' as const },
  progressBar: { display: 'flex', padding: '0 16px 12px', gap: '6px' },
  progressStep: (active: boolean) => ({ height: '4px', flex: 1, borderRadius: '999px', backgroundColor: active ? '#0D9488' : '#E5E7EB', transition: 'background-color 0.3s' }),
  content: { padding: '20px 16px 120px' },
  subtitle: { color: '#6B7280', fontSize: '14px', marginBottom: '16px' },
  serviceCard: (selected: boolean) => ({
    padding: '16px',
    borderRadius: '16px',
    border: selected ? '2px solid #0D9488' : '2px solid #F3F4F6',
    backgroundColor: selected ? '#F0FDFA' : '#fff',
    marginBottom: '12px',
    cursor: 'pointer',
    WebkitTapHighlightColor: 'transparent',
    userSelect: 'none' as const,
    boxShadow: selected ? '0 4px 12px rgba(13,148,136,0.15)' : 'none',
    transition: 'all 0.2s'
  }),
  serviceName: { fontWeight: 'bold', fontSize: '16px', color: '#1F2937' },
  serviceDuration: { fontSize: '13px', color: '#9CA3AF', marginTop: '4px' },
  serviceDesc: { fontSize: '12px', color: '#9CA3AF', marginTop: '4px' },
  servicePrice: { fontSize: '20px', fontWeight: 'bold', color: '#0D9488', textAlign: 'right' as const },
  depositBadge: { display: 'inline-block', marginTop: '4px', padding: '2px 8px', backgroundColor: '#FFF7ED', color: '#F97316', fontSize: '12px', borderRadius: '999px' },
  staffCard: (selected: boolean) => ({
    padding: '16px',
    borderRadius: '16px',
    border: selected ? '2px solid #0D9488' : '2px solid #F3F4F6',
    backgroundColor: selected ? '#F0FDFA' : '#fff',
    marginBottom: '12px',
    cursor: 'pointer',
    WebkitTapHighlightColor: 'transparent',
    userSelect: 'none' as const,
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    transition: 'all 0.2s'
  }),
  staffAvatar: {
    width: '56px',
    height: '56px',
    borderRadius: '50%',
    backgroundColor: '#CCFBF1',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#0D9488',
    flexShrink: 0
  },
  dateChip: (selected: boolean) => ({
    flexShrink: 0,
    width: '64px',
    padding: '12px 0',
    borderRadius: '16px',
    textAlign: 'center' as const,
    backgroundColor: selected ? '#0D9488' : '#fff',
    color: selected ? '#fff' : '#4B5563',
    border: selected ? 'none' : '1px solid #F3F4F6',
    cursor: 'pointer',
    transition: 'all 0.2s',
    boxShadow: selected ? '0 4px 12px rgba(13,148,136,0.3)' : 'none'
  }),
  dateChipDay: (selected: boolean) => ({ fontSize: '11px', color: selected ? '#CCFBF1' : '#9CA3AF' }),
  dateChipNum: { fontSize: '18px', fontWeight: 'bold' },
  timeSlot: (selected: boolean, available: boolean) => ({
    padding: '12px',
    borderRadius: '12px',
    fontSize: '14px',
    fontWeight: '500',
    textAlign: 'center' as const,
    backgroundColor: selected ? '#0D9488' : available ? '#fff' : '#F3F4F6',
    color: selected ? '#fff' : available ? '#374151' : '#D1D5DB',
    border: selected ? 'none' : available ? '1px solid #F3F4F6' : 'none',
    cursor: available ? 'pointer' : 'not-allowed',
    transition: 'all 0.2s',
    boxShadow: selected ? '0 4px 12px rgba(13,148,136,0.3)' : 'none'
  }),
  bottomBar: {
    position: 'fixed' as const,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTop: '1px solid #E5E7EB',
    padding: '16px 16px 32px 16px',
    zIndex: 100,
  },
  button: (disabled: boolean) => ({
    width: '100%',
    padding: '14px',
    backgroundColor: disabled ? '#D1D5DB' : '#0D9488',
    color: '#fff',
    fontWeight: 'bold',
    fontSize: '16px',
    borderRadius: '12px',
    border: 'none',
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'all 0.2s'
  }),
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: '16px',
    padding: '20px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    width: '100%',
    maxWidth: 480,
    margin: '0 auto',
  },
  summaryRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' },
  summaryLabel: { color: '#9CA3AF', fontSize: '14px' },
  summaryValue: { fontWeight: '600', color: '#1F2937' },
  backButton: { padding: '4px', background: 'none', border: 'none', cursor: 'pointer' },
  checkIcon: { color: '#0D9488', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '8px' },
}

export default function BookingClient({ tenantId, initialTenant, initialServices, initialStaff }: BookingClientProps) {
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const [tenant, setTenant] = useState<TenantInfo | null>(initialTenant as TenantInfo | null)
  const [services, setServices] = useState<Service[]>(initialServices as Service[])
  const [staffList, setStaffList] = useState<Staff[]>(initialStaff as Staff[])
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([])
  const [currentStep, setCurrentStep] = useState(0)
  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null)
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [selectedTime, setSelectedTime] = useState<string>('')
  const [submitting, setSubmitting] = useState(false)
  const [bookingSuccess, setBookingSuccess] = useState(false)
  const [depositQrUrl, setDepositQrUrl] = useState<string>('')
  const [depositTotal, setDepositTotal] = useState(0)
  const [manualDeposit, setManualDeposit] = useState<any>(null)
  const [liffProfile, setLiffProfile] = useState<any>(null)

  const steps = ['เลือกบริการ', 'เลือกช่าง', 'เลือกวัน/เวลา', 'ยืนยันการจอง']

  // โหลดโปรไฟล์ LINE ผ่าน LIFF เพื่อผูกการจองกับไอดีลูกค้าใน LINE
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (typeof window === 'undefined') return
      try {
        const liffModule = await import('@line/liff')
        const liff = liffModule.default
        if (!(liff as any).isInitialized?.()) {
          await liff.init({ liffId: '2009324540-weVbZ1eR' })
        }
        if (!liff.isLoggedIn()) {
          liff.login()
          return
        }
        const profile = await liff.getProfile()
        if (!cancelled) setLiffProfile(profile)
      } catch (err) {
        console.error('LIFF init error:', err)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!selectedDate || !selectedService || !tenantId) return
    const staffParam = selectedStaff?.id || 'any'
    fetch('/api/booking/' + tenantId + '/timeslots?date=' + selectedDate + '&staffId=' + staffParam + '&serviceId=' + selectedService.id, {
      headers: { 'Content-Type': 'application/json' }
    })
      .then(r => r.json())
      .then(data => setTimeSlots(data.slots || []))
      .catch(() => setTimeSlots([]))
  }, [selectedDate, selectedStaff, selectedService, tenantId])

  const getNextDates = useCallback(() => {
    const dates: { dateStr: string; dayName: string; dayNum: number; monthName: string }[] = []
    const dayNames = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส']
    const monthNames = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']
    const today = new Date()
    for (let i = 0; i < 14 && dates.length < 7; i++) {
      const d = new Date(today)
      d.setDate(d.getDate() + i)
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      dates.push({
        dateStr,
        dayName: dayNames[d.getDay()],
        dayNum: d.getDate(),
        monthName: monthNames[d.getMonth()],
      })
    }
    return dates
  }, [])

  const filteredStaff = staffList.filter(s =>
    selectedService ? s.serviceIds?.includes(selectedService.id) : true
  )

  const handleConfirmBooking = async () => {
    if (!selectedService || !selectedDate || !selectedTime) return
    setSubmitting(true)

    const lineUserId = liffProfile?.userId || 'guest'
    const lineDisplayName = liffProfile?.displayName || 'ลูกค้า'

    if (selectedService.depositAmount > 0) {
      try {
        const res = await fetch(`/api/booking/${tenantId}/deposit`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            lineUserId,
            lineDisplayName,
            serviceId: selectedService.id,
            staffId: selectedStaff?.id || 'any',
            date: selectedDate,
            time: selectedTime,
            depositAmount: selectedService.depositAmount,
          }),
        })
        const data = await res.json()
        if (data.qrCodeUrl) {
          setDepositQrUrl(data.qrCodeUrl)
          setDepositTotal(data.totalAmount)
          setCurrentStep(4)
        } else if (data.mode === 'manual') {
          setManualDeposit(data)
          setCurrentStep(5)
        }
      } catch (err) {
        console.error(err)
      }
    } else {
      try {
        const res = await fetch(`/api/booking/${tenantId}/create`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            lineUserId,
            lineDisplayName,
            serviceId: selectedService.id,
            staffId: selectedStaff?.id || 'any',
            date: selectedDate,
            time: selectedTime,
          }),
        })
        const data = await res.json()
        if (data.bookingId) {
          setBookingSuccess(true)
          setCurrentStep(6)
        }
      } catch (err) {
        console.error(err)
      }
    }
    setSubmitting(false)
  }

  if (loading) {
    return (
      <div style={{ ...styles.page, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
        <div style={{ width: 40, height: 40, borderRadius: '999px', border: '4px solid #0D9488', borderTopColor: 'transparent' }} />
        <p style={{ marginTop: 16, color: '#6B7280', fontSize: 14 }}>กำลังโหลด...</p>
      </div>
    )
  }

  if (loadError || !tenant) {
    return (
      <div style={{ ...styles.page, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', padding: '0 24px' }}>
        <h1 style={{ fontSize: 20, fontWeight: '600', color: '#111827', marginBottom: 8 }}>
          ไม่พบร้านที่ต้องการจอง
        </h1>
        <p style={{ fontSize: 14, color: '#6B7280', textAlign: 'center' }}>
          กรุณาเปิดลิงก์จาก LINE หรือระบุรหัสร้านในลิงก์ให้ถูกต้อง
        </p>
      </div>
    )
  }

  if (currentStep === 6) {
    return (
      <div style={{ ...styles.page, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', padding: '0 24px' }}>
        <div style={{ width: 80, height: 80, borderRadius: '50%', backgroundColor: '#DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
          <svg width={40} height={40} viewBox="0 0 24 24" stroke="currentColor" fill="none" style={{ color: '#22C55E' }}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 style={{ fontSize: 22, fontWeight: '700', color: '#111827', marginBottom: 8 }}>จองสำเร็จ!</h2>
        <p style={{ fontSize: 14, color: '#6B7280', textAlign: 'center', marginBottom: 24 }}>การจองของคุณได้รับการยืนยันแล้ว</p>
        <div style={styles.summaryCard}>
          <div style={styles.summaryRow}>
            <span style={styles.summaryLabel}>บริการ</span>
            <span style={styles.summaryValue}>{selectedService?.name}</span>
          </div>
          <div style={styles.summaryRow}>
            <span style={styles.summaryLabel}>ช่าง</span>
            <span style={styles.summaryValue}>{selectedStaff?.name || 'ไม่ระบุ'}</span>
          </div>
          <div style={styles.summaryRow}>
            <span style={styles.summaryLabel}>วันที่</span>
            <span style={styles.summaryValue}>{selectedDate}</span>
          </div>
          <div style={styles.summaryRow}>
            <span style={styles.summaryLabel}>เวลา</span>
            <span style={styles.summaryValue}>{selectedTime} น.</span>
          </div>
          <div style={{ ...styles.summaryRow, borderTop: '1px solid #E5E7EB', paddingTop: 12, marginTop: 4 }}>
            <span style={styles.summaryLabel}>ราคา</span>
            <span style={{ ...styles.summaryValue, fontSize: 18, color: '#0D9488' }}>฿{selectedService?.price}</span>
          </div>
        </div>
        <button
          onClick={() => { setCurrentStep(0); setSelectedService(null); setSelectedStaff(null); setSelectedDate(''); setSelectedTime(''); setBookingSuccess(false) }}
          style={{ ...styles.button(false), marginTop: 24, maxWidth: 480 }}
        >
          จองอีกครั้ง
        </button>
      </div>
    )
  }

  if (currentStep === 4) {
    return (
      <div style={{ ...styles.page, padding: '40px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ width: '100%', maxWidth: 480, backgroundColor: '#fff', borderRadius: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
          <div style={{ backgroundColor: '#0D9488', padding: '12px 24px' }}>
            <h2 style={{ color: '#fff', fontWeight: '700', fontSize: 18, textAlign: 'center' }}>สแกนเพื่อชำระเงิน</h2>
          </div>
          <div style={{ padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {depositQrUrl && <img src={depositQrUrl} alt="QR Code" style={{ width: 256, height: 256, marginBottom: 16 }} />}
            <div style={{ borderTop: '1px solid #E5E7EB', width: '100%', paddingTop: 16, marginTop: 8 }}>
              <p style={{ textAlign: 'center', fontSize: 22, fontWeight: '700', color: '#0D9488' }}>฿{depositTotal.toFixed(2)}</p>
              <p style={{ textAlign: 'center', fontSize: 14, color: '#6B7280', marginTop: 8 }}>กรุณาสแกน QR Code เพื่อชำระค่ามัดจำ</p>
              <p style={{ textAlign: 'center', fontSize: 12, color: '#0D9488', marginTop: 4 }}>ระบบจะตรวจสอบอัตโนมัติ</p>
            </div>
          </div>
        </div>
        <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 12, textAlign: 'center', maxWidth: 320 }}>
          หลังชำระเงินสำเร็จ ระบบจะยืนยันการจองให้อัตโนมัติ
        </p>
      </div>
    )
  }

  if (currentStep === 5 && manualDeposit) {
    return (
      <div style={{ ...styles.page, padding: '40px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ width: '100%', maxWidth: 480, backgroundColor: '#fff', borderRadius: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
          <div style={{ backgroundColor: '#0D9488', padding: '12px 24px' }}>
            <h2 style={{ color: '#fff', fontWeight: '700', fontSize: 18, textAlign: 'center' }}>โอนเงินค่ามัดจำ</h2>
          </div>
          <div style={{ padding: 24 }}>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <p style={{ fontSize: 26, fontWeight: '700', color: '#0D9488' }}>฿{manualDeposit.depositAmount}</p>
            </div>
            <div style={{ backgroundColor: '#F9FAFB', borderRadius: 16, padding: 16 }}>
              <p style={{ fontSize: 14, fontWeight: '600', color: '#111827', marginBottom: 12 }}>ข้อมูลการโอนเงิน</p>
              {manualDeposit.bankName && (
                <div style={styles.summaryRow}>
                  <span style={styles.summaryLabel}>ธนาคาร</span>
                  <span style={styles.summaryValue}>{manualDeposit.bankName}</span>
                </div>
              )}
              {manualDeposit.bankAccountNumber && (
                <div style={styles.summaryRow}>
                  <span style={styles.summaryLabel}>เลขบัญชี</span>
                  <span style={{ ...styles.summaryValue, fontWeight: '700' }}>{manualDeposit.bankAccountNumber}</span>
                </div>
              )}
              {manualDeposit.bankAccountName && (
                <div style={styles.summaryRow}>
                  <span style={styles.summaryLabel}>ชื่อบัญชี</span>
                  <span style={styles.summaryValue}>{manualDeposit.bankAccountName}</span>
                </div>
              )}
              {manualDeposit.promptPayNumber && (
                <div style={styles.summaryRow}>
                  <span style={styles.summaryLabel}>PromptPay</span>
                  <span style={{ ...styles.summaryValue, fontWeight: '700' }}>{manualDeposit.promptPayNumber}</span>
                </div>
              )}
            </div>
            <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 12, textAlign: 'center' }}>
              หลังโอนเงินแล้ว กรุณาส่งสลิปมาที่แชท LINE ของร้าน
            </p>
          </div>
        </div>
      </div>
    )
  }

  const nextDisabled =
    (currentStep === 0 && !selectedService) ||
    (currentStep === 2 && (!selectedDate || !selectedTime))

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {currentStep > 0 ? (
            <button onClick={() => setCurrentStep(currentStep - 1)} style={styles.backButton}>
              <svg width={24} height={24} viewBox="0 0 24 24" stroke="currentColor" fill="none" style={{ color: '#4B5563' }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          ) : <div style={{ width: 24 }} />}
          <div>
            <div style={styles.headerTitle}>{tenant?.name || 'จองคิว'}</div>
            <div style={styles.headerSubtitle}>{steps[currentStep]}</div>
          </div>
          <div style={{ width: 24 }} />
        </div>
        <div style={styles.progressBar}>
          {steps.map((_, i) => (
            <div key={i} style={styles.progressStep(i <= currentStep)} />
          ))}
        </div>
      </header>

      <main style={styles.content}>
        {currentStep === 0 && (
          <div>
            <p style={styles.subtitle}>เลือกบริการที่ต้องการ</p>
            {services.map(service => (
              <div
                key={service.id}
                onClick={() => setSelectedService(service)}
                style={styles.serviceCard(selectedService?.id === service.id)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <h3 style={styles.serviceName}>{service.name}</h3>
                    <p style={styles.serviceDuration}>⏱ {service.durationMinutes} นาที</p>
                    {service.description && <p style={styles.serviceDesc}>{service.description}</p>}
                  </div>
                  <div style={{ textAlign: 'right', marginLeft: 16 }}>
                    <p style={styles.servicePrice}>฿{service.price.toLocaleString()}</p>
                    {service.depositAmount > 0 && (
                      <span style={styles.depositBadge}>
                        มัดจำ ฿{service.depositAmount.toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
                {selectedService?.id === service.id && (
                  <div style={styles.checkIcon}>
                    <svg width={16} height={16} viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    เลือกแล้ว
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {currentStep === 1 && (
          <div>
            <p style={styles.subtitle}>เลือกช่างที่ต้องการ</p>
            <div
              onClick={() => setSelectedStaff(null)}
              style={styles.staffCard(selectedStaff === null)}
            >
              <div style={styles.staffAvatar}>🎲</div>
              <div>
                <h3 style={styles.serviceName}>ไม่ระบุช่าง (ให้ร้านเลือกให้)</h3>
              </div>
            </div>
            {filteredStaff.map(staff => (
              <div
                key={staff.id}
                onClick={() => setSelectedStaff(staff)}
                style={styles.staffCard(selectedStaff?.id === staff.id)}
              >
                <div style={styles.staffAvatar}>
                  {staff.imageUrl
                    ? <img src={staff.imageUrl} alt={staff.name} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                    : staff.name.charAt(0)}
                </div>
                <div>
                  <h3 style={styles.serviceName}>{staff.name}</h3>
                </div>
                {selectedStaff?.id === staff.id && (
                  <div style={{ marginLeft: 'auto' }}>
                    <svg width={20} height={20} viewBox="0 0 20 20" fill="currentColor" style={{ color: '#0D9488' }}>
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {currentStep === 2 && (
          <div>
            <p style={styles.subtitle}>เลือกวันและเวลา</p>
            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', padding: '0 16px 16px', margin: '0 -16px' }}>
              {getNextDates().map(d => (
                <button
                  key={d.dateStr}
                  onClick={() => { setSelectedDate(d.dateStr); setSelectedTime('') }}
                  style={styles.dateChip(selectedDate === d.dateStr)}
                >
                  <p style={styles.dateChipDay(selectedDate === d.dateStr)}>{d.dayName}</p>
                  <p style={styles.dateChipNum}>{d.dayNum}</p>
                  <p style={styles.dateChipDay(selectedDate === d.dateStr)}>{d.monthName}</p>
                </button>
              ))}
            </div>

            {selectedDate && (
              <div style={{ marginTop: 16 }}>
                <p style={{ ...styles.subtitle, marginBottom: 12 }}>เลือกเวลา</p>
                {timeSlots.length === 0 ? (
                  <p style={{ color: '#9CA3AF', fontSize: 14, textAlign: 'center', padding: '32px 0' }}>กำลังโหลดเวลาว่าง...</p>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                    {timeSlots.map(slot => (
                      <button
                        key={slot.time}
                        onClick={() => slot.available && setSelectedTime(slot.time)}
                        disabled={!slot.available}
                        style={styles.timeSlot(selectedTime === slot.time, slot.available)}
                      >
                        {slot.time}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {currentStep === 3 && (
          <div>
            <p style={styles.subtitle}>ตรวจสอบข้อมูลการจอง</p>
            <div style={styles.summaryCard}>
              <div style={styles.summaryRow}>
                <span style={styles.summaryLabel}>บริการ</span>
                <span style={styles.summaryValue}>{selectedService?.name}</span>
              </div>
              <div style={styles.summaryRow}>
                <span style={styles.summaryLabel}>ช่าง</span>
                <span style={styles.summaryValue}>{selectedStaff?.name || 'ไม่ระบุ'}</span>
              </div>
              <div style={styles.summaryRow}>
                <span style={styles.summaryLabel}>วันที่</span>
                <span style={styles.summaryValue}>{selectedDate}</span>
              </div>
              <div style={styles.summaryRow}>
                <span style={styles.summaryLabel}>เวลา</span>
                <span style={styles.summaryValue}>{selectedTime} น.</span>
              </div>
              <div style={styles.summaryRow}>
                <span style={styles.summaryLabel}>ระยะเวลา</span>
                <span style={styles.summaryValue}>{selectedService?.durationMinutes} นาที</span>
              </div>
              <div style={{ ...styles.summaryRow, borderTop: '1px solid #E5E7EB', paddingTop: 12, marginTop: 4 }}>
                <span style={styles.summaryLabel}>ราคาบริการ</span>
                <span style={{ ...styles.summaryValue, fontSize: 18, color: '#0D9488' }}>฿{selectedService?.price.toLocaleString()}</span>
              </div>
              {selectedService && selectedService.depositAmount > 0 && (
                <div style={{ marginTop: 8, padding: 12, borderRadius: 12, backgroundColor: '#FFF7ED' }}>
                  <div style={styles.summaryRow}>
                    <span style={{ ...styles.summaryLabel, color: '#EA580C' }}>ค่ามัดจำ</span>
                    <span style={{ ...styles.summaryValue, color: '#EA580C' }}>฿{selectedService.depositAmount.toLocaleString()}</span>
                  </div>
                  <p style={{ fontSize: 12, color: '#FDBA74', marginTop: 4 }}>
                    ชำระค่ามัดจำก่อนเพื่อยืนยันการจอง ส่วนที่เหลือชำระที่ร้าน
                  </p>
                </div>
              )}
            </div>

            {liffProfile && (
              <div style={{ marginTop: 16, backgroundColor: '#fff', borderRadius: 16, padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', gap: 12 }}>
                {liffProfile.pictureUrl && (
                  <img src={liffProfile.pictureUrl} alt="" style={{ width: 40, height: 40, borderRadius: '50%' }} />
                )}
                <div>
                  <p style={{ fontWeight: 500, color: '#111827' }}>{liffProfile.displayName}</p>
                  <p style={{ fontSize: 12, color: '#9CA3AF' }}>จองในชื่อนี้</p>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {currentStep <= 3 && (
        <div style={styles.bottomBar}>
          {currentStep < 3 ? (
            <button
              onClick={() => setCurrentStep(currentStep + 1)}
              type="button"
              disabled={nextDisabled}
              style={styles.button(nextDisabled)}
            >
              ถัดไป
            </button>
          ) : (
            <button
              onClick={handleConfirmBooking}
              disabled={submitting}
              type="button"
              style={styles.button(submitting)}
            >
              {submitting
                ? 'กำลังดำเนินการ...'
                : selectedService && selectedService.depositAmount > 0
                  ? `ชำระค่ามัดจำ ฿${selectedService.depositAmount.toLocaleString()}`
                  : 'ยืนยันการจอง'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

