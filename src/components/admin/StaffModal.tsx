 "use client"
import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X, Camera } from 'lucide-react'
import { createStaff, updateStaff } from '@/lib/firebase/staff'
import { uploadStaffImage } from '@/lib/firebase/storage'
import type { Staff, Service } from '@/types'

function getInitial(name: string) {
  return (name.trim()[0] ?? '?').toUpperCase()
}

interface Props {
  tenantId: string
  staff?: Staff | null
  services: Service[]
  tenantDefaults?: { openTime: string; closeTime: string; openDays: number[] } | null
  onClose: () => void
  onSuccess: () => void
}

const DAYS = ['จันทร์','อังคาร','พุธ','พฤหัส','ศุกร์','เสาร์','อาทิตย์']

export default function StaffModal({ tenantId, staff, services, tenantDefaults, onClose, onSuccess }: Props) {
  const isEdit = !!staff
  const [name, setName] = useState(staff?.name ?? '')
  const [serviceIds, setServiceIds] = useState<string[]>(staff?.serviceIds ?? [])
  const [workDays, setWorkDays] = useState<number[]>(
    staff?.workDays ?? tenantDefaults?.openDays ?? [1, 2, 3, 4, 5]
  )
  const [startTime, setStartTime] = useState(
    staff?.workStartTime ?? tenantDefaults?.openTime ?? '09:00'
  )
  const [endTime, setEndTime] = useState(
    staff?.workEndTime ?? tenantDefaults?.closeTime ?? '18:00'
  )
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<{ name?: string; services?: string }>({})
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setErrors({})
    setImageFile(null)
    setImagePreview(null)
  }, [staff])

  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview)
    }
  }, [imagePreview])

  useEffect(() => {
    if (!staff && tenantDefaults) {
      setStartTime(tenantDefaults.openTime)
      setEndTime(tenantDefaults.closeTime)
      setWorkDays(tenantDefaults.openDays)
    }
  }, [staff, tenantDefaults])

  function toggleService(id: string) {
    setServiceIds(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id])
    setErrors(prev => ({ ...prev, services: undefined }))
  }

  function toggleDay(day: number) {
    setWorkDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort())
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !file.type.startsWith('image/')) return
    if (imagePreview) URL.revokeObjectURL(imagePreview)
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
    e.target.value = ''
  }

  async function handleSubmit() {
    const next: { name?: string; services?: string } = {}
    if (!name.trim()) next.name = 'กรุณากรอกชื่อ'
    if (serviceIds.length === 0) next.services = 'กรุณาเลือกบริการอย่างน้อย 1 อย่าง'
    setErrors(next)
    if (Object.keys(next).length > 0) return
    setLoading(true)
    try {
      const baseData = {
        name,
        serviceIds,
        workDays,
        workStartTime: startTime,
        workEndTime: endTime,
        isActive: true,
      }
      if (isEdit) {
        let imageUrl = staff!.imageUrl
        if (imageFile) imageUrl = await uploadStaffImage(tenantId, staff!.id, imageFile)
        await updateStaff(tenantId, staff!.id, { ...baseData, imageUrl })
      } else {
        const staffId = await createStaff(tenantId, { ...baseData, imageUrl: '' })
        if (imageFile) {
          const imageUrl = await uploadStaffImage(tenantId, staffId, imageFile)
          await updateStaff(tenantId, staffId, { imageUrl })
        }
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
            <div className="flex flex-col items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="relative w-24 h-24 rounded-full overflow-hidden bg-slate-100 border-2 border-slate-200 flex items-center justify-center text-slate-400 hover:border-teal-500 hover:bg-teal-50 transition-colors shrink-0"
              >
                {imagePreview ? (
                  <img src={imagePreview} alt="" className="w-full h-full object-cover" />
                ) : staff?.imageUrl ? (
                  <img src={staff.imageUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-3xl font-semibold text-teal-600">
                    {getInitial(name)}
                  </span>
                )}
                <span className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 hover:opacity-100 transition-opacity rounded-full">
                  <Camera className="w-8 h-8 text-white" />
                </span>
              </button>
              <span className="text-xs text-slate-500">คลิกเพื่ออัปโหลดรูป</span>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">ชื่อ *</label>
              <input
                value={name}
                onChange={e => { setName(e.target.value); setErrors(prev => ({ ...prev, name: undefined })) }}
                placeholder="ชื่อพนักงาน"
                className={`w-full px-4 py-3 rounded-xl border text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm ${errors.name ? 'border-red-500' : 'border-slate-200'}`}
              />
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">บริการที่รับ *</label>
              <div className={`flex flex-wrap gap-2 rounded-xl p-2 ${errors.services ? 'ring-2 ring-red-500 ring-inset' : ''}`}>
                {services.map(s => (
                  <button key={s.id} type="button" onClick={() => toggleService(s.id)} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${serviceIds.includes(s.id) ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                    {s.name}
                  </button>
                ))}
              </div>
              {errors.services && <p className="text-red-500 text-xs mt-1">{errors.services}</p>}
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

