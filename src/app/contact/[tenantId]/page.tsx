'use client'

import { Prompt } from 'next/font/google'
import { useParams } from 'next/navigation'
import { useState, useEffect } from 'react'

const prompt = Prompt({
  weight: ['400', '500', '600', '700'],
  subsets: ['thai', 'latin'],
  display: 'swap',
})

const DAY_NAMES = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์']

export default function TenantContactPage() {
  const params = useParams()
  const tenantId = params.tenantId as string
  const [data, setData] = useState<{
    tenant?: {
      id: string
      name?: string
      phone?: string
      address?: string
      lineId?: string
      openTime?: string
      closeTime?: string
      openDays?: number[]
    }
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || (typeof window !== 'undefined' ? window.location.origin : '')
    fetch(baseUrl + '/api/booking/' + tenantId, { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then(setData)
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [tenantId])

  const tenant = data?.tenant
  const hasContact = tenant && (tenant.phone || tenant.address || tenant.lineId)
  const lineOaUrl = tenant?.lineId
    ? (tenant.lineId.startsWith('http') ? tenant.lineId : 'https://line.me/R/ti/p/' + (tenant.lineId.startsWith('@') ? tenant.lineId : '@' + tenant.lineId))
    : ''

  if (loading) {
    return (
      <div className={prompt.className} style={{ fontFamily: 'Prompt, sans-serif' }}>
        <div className="min-h-screen bg-[#0F172A] flex items-center justify-center">
          <div className="w-10 h-10 rounded-full border-2 border-[#0D9488] border-t-transparent animate-spin" />
        </div>
      </div>
    )
  }

  if (error || !tenant) {
    return (
      <div className={prompt.className} style={{ fontFamily: 'Prompt, sans-serif' }}>
        <div className="min-h-screen bg-[#0F172A] text-white flex flex-col items-center justify-center px-6">
          <p className="text-slate-400">ไม่พบร้านที่ต้องการ</p>
        </div>
      </div>
    )
  }

  const openDaysText = tenant.openDays?.length
    ? tenant.openDays
        .slice()
        .sort((a, b) => a - b)
        .map((d) => DAY_NAMES[d])
        .join(', ')
    : ''

  return (
    <div className={prompt.className} style={{ fontFamily: 'Prompt, sans-serif' }}>
      <div className="min-h-screen bg-[#0F172A] text-white">
        <div className="max-w-lg mx-auto px-4 py-12">
          <h1 className="text-2xl font-bold mb-8" style={{ color: '#0D9488' }}>
            {tenant.name || 'ติดต่อร้าน'}
          </h1>

          {hasContact ? (
            <div className="space-y-4">
              {tenant.phone ? (
                <div className="p-4 rounded-xl bg-[#1E293B] border border-slate-600/30">
                  <p className="text-slate-400 text-sm mb-1">เบอร์โทร</p>
                  <a
                    href={'tel:' + tenant.phone}
                    className="font-medium"
                    style={{ color: '#0D9488' }}
                  >
                    {tenant.phone}
                  </a>
                </div>
              ) : null}
              {tenant.lineId ? (
                <div className="p-4 rounded-xl bg-[#1E293B] border border-slate-600/30">
                  <p className="text-slate-400 text-sm mb-1">LINE ID</p>
                  <p className="font-medium">{tenant.lineId}</p>
                  {lineOaUrl ? (
                    <a
                      href={lineOaUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block mt-2 px-4 py-2 rounded-lg text-white text-sm font-medium transition-opacity hover:opacity-90"
                      style={{ backgroundColor: '#06C755' }}
                    >
                      เปิดแชท LINE
                    </a>
                  ) : null}
                </div>
              ) : null}
              {tenant.address ? (
                <div className="p-4 rounded-xl bg-[#1E293B] border border-slate-600/30">
                  <p className="text-slate-400 text-sm mb-1">ที่อยู่</p>
                  <p className="font-medium">{tenant.address}</p>
                </div>
              ) : null}
              {(tenant.openTime || tenant.closeTime) ? (
                <div className="p-4 rounded-xl bg-[#1E293B] border border-slate-600/30">
                  <p className="text-slate-400 text-sm mb-1">เวลาเปิด-ปิด</p>
                  <p className="font-medium">
                    {tenant.openTime || '–'} – {tenant.closeTime || '–'} น.
                  </p>
                </div>
              ) : null}
              {openDaysText ? (
                <div className="p-4 rounded-xl bg-[#1E293B] border border-slate-600/30">
                  <p className="text-slate-400 text-sm mb-1">วันที่เปิด</p>
                  <p className="font-medium">{openDaysText}</p>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="p-6 rounded-xl bg-[#1E293B] border border-slate-600/30 text-center">
              <p className="text-slate-300 mb-4">ติดต่อผ่าน LINE</p>
              {lineOaUrl ? (
                <a
                  href={lineOaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-white font-semibold transition-all hover:opacity-90"
                  style={{ backgroundColor: '#06C755' }}
                >
                  <span>เปิดแชท LINE</span>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 10.304c0-5.369-5.383-9.738-12-9.738-6.616 0-12 4.369-12 9.738 0 4.814 4.269 8.846 10.036 9.608.391.084.922.258 1.057.592.121.303.079.778.039 1.085l-.171 1.027c-.053.303-.242 1.186 1.039.647 1.281-.539 6.911-4.078 9.436-6.975C23.666 14.02 24 12.222 24 10.304z" />
                  </svg>
                </a>
              ) : (
                <p className="text-slate-500 text-sm">ไม่มีข้อมูล LINE ของร้าน</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
