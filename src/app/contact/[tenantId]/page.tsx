import Link from 'next/link'
import { Prompt } from 'next/font/google'
import { adminDb } from '@/lib/firebase/admin'

const prompt = Prompt({
  weight: ['300', '400', '500', '600', '700'],
  subsets: ['thai', 'latin'],
  display: 'swap',
})

const BUSINESS_ICON: Record<string, string> = {
  salon: '💇‍♀️',
  spa: '🧖‍♀️',
  clinic: '🏥',
  barbershop: '✂️',
  other: '✨',
}

const DAY_NAMES = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์']

export async function generateMetadata({
  params,
}: {
  params: { tenantId: string }
}) {
  const tenantDoc = await adminDb.collection('tenants').doc(params.tenantId).get()
  const name = tenantDoc.exists ? (tenantDoc.data()?.name as string) || 'ติดต่อร้าน' : 'ติดต่อร้าน'
  return { title: name + ' | JongMe' }
}

export default async function TenantContactPage({
  params,
}: {
  params: { tenantId: string }
}) {
  const { tenantId } = params
  const tenantDoc = await adminDb.collection('tenants').doc(tenantId).get()

  if (!tenantDoc.exists) {
    return (
      <div className={prompt.className} style={{ fontFamily: 'Prompt, sans-serif' }}>
        <div className="min-h-screen bg-[#0F172A] text-white flex flex-col items-center justify-center px-6">
          <p className="text-slate-400">ไม่พบร้านที่ต้องการ</p>
        </div>
      </div>
    )
  }

  const raw = tenantDoc.data()
  const tenant = {
    id: tenantId,
    name: (raw?.name as string) || '',
  businessType: (raw?.businessType as string) || 'other',
    phone: (raw?.phone as string) || '',
    address: (raw?.address as string) || '',
    lineId: (raw?.lineId as string) || (raw?.lineOaId as string) || '',
    openTime: (raw?.openTime as string) || '',
    closeTime: (raw?.closeTime as string) || '',
    openDays: (raw?.openDays as number[]) || [],
  }

  const hasContact = !!(tenant.phone || tenant.address || tenant.lineId)
  const lineOaUrl = tenant.lineId
    ? tenant.lineId.startsWith('http')
      ? tenant.lineId
      : 'https://line.me/R/ti/p/' + (tenant.lineId.startsWith('@') ? tenant.lineId : '@' + tenant.lineId)
    : ''

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
        <div className="max-w-lg mx-auto px-5 py-6 pb-16">
          <Link
            href="/contact"
            className="inline-flex items-center gap-1 text-slate-400 hover:text-[#0D9488] text-sm font-medium mb-6 transition-colors"
          >
            ← กลับ
          </Link>

          <header className="text-center pt-4 pb-10">
            <h1 className="text-3xl sm:text-4xl font-bold mb-2" style={{ color: '#0D9488' }}>
              <span className="mr-2">
                {BUSINESS_ICON[tenant.businessType] ?? BUSINESS_ICON.other}
              </span>
              {tenant.name || 'ติดต่อร้าน'}
            </h1>
            <p className="text-slate-400 text-lg">ติดต่อร้านค้า</p>
          </header>

          {hasContact ? (
            <div className="space-y-5">
              {tenant.phone ? (
                <div className="p-5 rounded-2xl bg-[#1E293B] border border-slate-600/30">
                  <p className="text-slate-400 text-sm mb-2 flex items-center gap-2">
                    <span>📞</span> เบอร์โทร
                  </p>
                  <p className="font-medium text-lg mb-3">{tenant.phone}</p>
                  <a
                    href={'tel:' + tenant.phone}
                    className="inline-flex items-center justify-center w-full py-3 rounded-xl font-semibold text-white transition-opacity hover:opacity-90"
                    style={{ backgroundColor: '#0D9488' }}
                  >
                    โทรเลย
                  </a>
                </div>
              ) : null}
              {tenant.lineId ? (
                <div className="p-5 rounded-2xl bg-[#1E293B] border border-slate-600/30">
                  <p className="text-slate-400 text-sm mb-2 flex items-center gap-2">
                    <span>💬</span> LINE ID
                  </p>
                  <p className="font-medium text-lg mb-4">{tenant.lineId}</p>
                  {lineOaUrl ? (
                    <a
                      href={lineOaUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 w-full py-4 rounded-xl text-white text-base font-semibold transition-opacity hover:opacity-90"
                      style={{ backgroundColor: '#06C755' }}
                    >
                      <span>เปิดแชท LINE</span>
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M24 10.304c0-5.369-5.383-9.738-12-9.738-6.616 0-12 4.369-12 9.738 0 4.814 4.269 8.846 10.036 9.608.391.084.922.258 1.057.592.121.303.079.778.039 1.085l-.171 1.027c-.053.303-.242 1.186 1.039.647 1.281-.539 6.911-4.078 9.436-6.975C23.666 14.02 24 12.222 24 10.304z" />
                      </svg>
                    </a>
                  ) : null}
                </div>
              ) : null}
              {tenant.address ? (
                <div className="p-5 rounded-2xl bg-[#1E293B] border border-slate-600/30">
                  <p className="text-slate-400 text-sm mb-2 flex items-center gap-2">
                    <span>📍</span> ที่อยู่
                  </p>
                  <p className="font-medium">{tenant.address}</p>
                </div>
              ) : null}
              {(tenant.openTime || tenant.closeTime) ? (
                <div className="p-5 rounded-2xl bg-[#1E293B] border border-slate-600/30">
                  <p className="text-slate-400 text-sm mb-2 flex items-center gap-2">
                    <span>🕐</span> เวลาเปิด-ปิด
                  </p>
                  <p className="font-medium">
                    {tenant.openTime || '–'} – {tenant.closeTime || '–'} น.
                  </p>
                </div>
              ) : null}
              {openDaysText ? (
                <div className="p-5 rounded-2xl bg-[#1E293B] border border-slate-600/30">
                  <p className="text-slate-400 text-sm mb-2 flex items-center gap-2">
                    <span>📅</span> วันที่เปิด
                  </p>
                  <p className="font-medium">{openDaysText}</p>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="p-8 rounded-2xl bg-[#1E293B] border border-slate-600/30 text-center">
              <p className="text-slate-300 text-lg mb-6">ติดต่อผ่าน LINE</p>
              {lineOaUrl ? (
                <a
                  href={lineOaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 w-full max-w-xs mx-auto px-8 py-4 rounded-xl text-white text-lg font-semibold transition-all hover:opacity-90"
                  style={{ backgroundColor: '#06C755' }}
                >
                  <span>เปิดแชท LINE</span>
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
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
