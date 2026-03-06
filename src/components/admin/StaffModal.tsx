 "use client"
import { useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { createStaff, updateStaff } from '@/lib/firebase/staff'
import type { Staff, Service } from '@/types'

interface Props {
  tenantId: string
  staff?: Staff | null
  services: Service[]
  onClose: () => void
  onSuccess: () => void
}

const DAYS = ['จันทร์','อังคาร','พุธ','พฤหัส','ศุกร์','เสาร์','อาทิตย์']

export default function StaffModal({ tenantId, staff, services, onClose, onSuccess }: Props) {
  const isEdit = !!staff
  const [name, setName] = useState(staff?.name ?? '')
  const [serviceIds, setServiceIds] = useState<string[]>(staff?.serviceIds ?? [])
  const [workDays, setWorkDays] = useState<number[]>(staff?.workDays ?? [1,2,3,4,5])
  const [startTime, setStartTime] = useState(staff?.workStartTime ?? '09:00')
  const [endTime, setEndTime] = useState(staff?.workEndTime ?? '18:00')
  const [loading, setLoading] = useState(false)

  function toggleService(id: string) {
    setServiceIds(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id])
  }

  function toggleDay(day: number) {
    setWorkDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort())
  }

  async function handleSubmit() {
    if (!name.trim()) return
    setLoading(true)
    try {
      const data = { name, serviceIds, workDays, workStartTime: startTime, workEndTime: endTime, isActive: true, imageUrl: '' }
      if (isEdit) {
        await updateStaff(tenantId, staff!.id, data)
      } else {
        await createStaff(tenantId, data)
      }
      onSuccess()
      onClose()
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (typeof document === 'undefined') return null

  return createPortal(
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(0,0,0,0.4)',
          zIndex: 99998,
        }}
      />
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 99999,
          width: '100%',
          maxWidth: '28rem',
          padding: '0 16px',
        }}
      >
        <div className="bg-white rounded-2xl shadow-2xl w-full overflow-hidden">
          <div className="bg-linear-to-r from-teal-600 to-cyan-500 px-6 py-4 flex items-center justify-between rounded-t-2xl">
            <h2 className="text-white font-semibold text-lg">{isEdit ? 'แก้ไขพนักงาน' : 'เพิ่มพนักงาน'}</h2>
            <button onClick={onClose} className="text-white/80 hover:text-white transition-colors">
              <X size={20} />
            </button>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">ชื่อ *</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="ชื่อพนักงาน" className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">บริการที่รับ</label>
              <div className="flex flex-wrap gap-2">
                {services.map(s => (
                  <button key={s.id} onClick={() => toggleService(s.id)} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${serviceIds.includes(s.id) ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                    {s.name}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">วันทำงาน</label>
              <div className="flex flex-wrap gap-2">
                {DAYS.map((day, i) => (
                  <button key={i} onClick={() => toggleDay(i+1)} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${workDays.includes(i+1) ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                    {day}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 p-4 bg-teal-50 rounded-xl">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">เวลาเริ่ม *</label>
                <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">เวลาสิ้นสุด *</label>
                <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm" />
              </div>
            </div>
          </div>
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 rounded-b-2xl">
            <button onClick={onClose} className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-100 transition-colors">ยกเลิก</button>
            <button onClick={handleSubmit} disabled={loading} className="px-5 py-2.5 rounded-xl bg-teal-600 text-white text-sm font-medium hover:bg-teal-700 transition-colors disabled:opacity-50">
              {loading ? 'กำลังบันทึก...' : isEdit ? 'บันทึก' : 'เพิ่ม'}
            </button>
          </div>
        </div>
      </div>
    </>,
    document.body
  )
}

