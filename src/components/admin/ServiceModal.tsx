 "use client"
import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { createService, updateService } from '@/lib/firebase/services'
import type { Service } from '@/types'

interface Props {
  tenantId: string
  service?: Service | null
  onClose: () => void
  onSuccess: () => void
}

export default function ServiceModal({ tenantId, service, onClose, onSuccess }: Props) {
  const isEdit = !!service
  const [name, setName] = useState(service?.name ?? '')
  const [description, setDescription] = useState(service?.description ?? '')
  const [duration, setDuration] = useState(service?.durationMinutes ?? 60)
  const [price, setPrice] = useState(service?.price ?? 0)
  const [deposit, setDeposit] = useState(service?.depositAmount ?? 0)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (service) {
      setName(service.name ?? '')
      setDescription(service.description ?? '')
      setDuration(service.durationMinutes ?? 60)
      setPrice(service.price ?? 0)
      setDeposit(service.depositAmount ?? 0)
    }
  }, [service])

  async function handleSubmit() {
    if (!name.trim()) return
    setLoading(true)
    try {
      const depositAmount = Number(deposit) || 0
      if (isEdit) {
        const data = {
          name,
          description,
          durationMinutes: duration,
          price,
          depositAmount,
        }
        console.log('ServiceModal update payload', data)
        await updateService(tenantId, service!.id, data)
      } else {
        const data = {
          name,
          description,
          durationMinutes: duration,
          price,
          depositAmount,
          imageUrl: '',
          isActive: true,
        }
        console.log('ServiceModal create payload', data)
        await createService(tenantId, data)
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
            <h2 className="text-white font-semibold text-lg">{isEdit ? 'แก้ไขบริการ' : 'เพิ่มบริการ'}</h2>
            <button onClick={onClose} className="text-white/80 hover:text-white transition-colors">
              <X size={20} />
            </button>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">ชื่อบริการ *</label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="เช่น ตัดผมชาย"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">คำอธิบาย</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={3}
                placeholder="รายละเอียดบริการ"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm resize-none"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-teal-50 rounded-xl">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">ระยะเวลา (นาที) *</label>
                <input
                  type="number"
                  value={duration}
                  onChange={e => setDuration(Number(e.target.value))}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">ราคา (บาท) *</label>
                <input
                  type="number"
                  value={price}
                  onChange={e => setPrice(Number(e.target.value))}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">ค่ามัดจำ (บาท)</label>
                <input
                  type="number"
                  min={0}
                  value={String(deposit)}
                  onChange={e => setDeposit(Number(e.target.value))}
                  placeholder="0 = ไม่มีค่ามัดจำ"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                />
                <p className="mt-1 text-xs text-slate-600">
                  ถ้าใส่ 0 หรือเว้นว่าง ลูกค้าจองได้เลยไม่ต้องจ่ายมัดจำ
                </p>
              </div>
            </div>
            {Number(deposit) > 0 && (
              <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-800">
                ลูกค้าต้องจ่ายค่ามัดจำ ฿{Number(deposit).toLocaleString()} ก่อนจองบริการนี้
              </div>
            )}
          </div>
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 rounded-b-2xl">
            <button
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-100 transition-colors"
            >
              ยกเลิก
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-teal-600 text-white text-sm font-medium hover:bg-teal-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'กำลังบันทึก...' : isEdit ? 'บันทึก' : 'เพิ่ม'}
            </button>
          </div>
        </div>
      </div>
    </>,
    document.body
  )
}

