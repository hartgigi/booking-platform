'use client'

import { Kanit } from 'next/font/google'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

const contactFont = Kanit({
  subsets: ['thai', 'latin'],
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
})

const HERO_STAGGER = 120
const COUNT_DURATION = 1500
const COUNT_INTERVAL = 50

function useCountUp(end: number, visible: boolean) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (!visible) {
      setCount(0)
      return
    }
    const startTime = Date.now()
    const timer = setInterval(() => {
      const elapsed = Date.now() - startTime
      const t = Math.min(elapsed / COUNT_DURATION, 1)
      const eased = 1 - (1 - t) * (1 - t)
      setCount(Math.round(eased * end))
      if (t >= 1) clearInterval(timer)
    }, COUNT_INTERVAL)
    return () => clearInterval(timer)
  }, [end, visible])
  return count
}

function useInView(threshold = 0.2) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      ([e]) => setVisible(e.isIntersecting),
      { threshold }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return { ref, visible }
}

export default function ContactPage() {
  const router = useRouter()
  const [heroMounted, setHeroMounted] = useState(false)
  const [heroScrollY, setHeroScrollY] = useState(0)
  const heroRef = useRef<HTMLElement>(null)
  const statsInView = useInView(0.3)
  const featuresInView = useInView(0.15)
  const [featureVisible, setFeatureVisible] = useState(false)
  const featureSectionRef = useRef<HTMLElement>(null)
  const [videoPlaying, setVideoPlaying] = useState(false)

  useEffect(() => {
    setHeroMounted(true)
  }, [])

  useEffect(() => {
    const onScroll = () => {
      if (heroRef.current) {
        const rect = heroRef.current.getBoundingClientRect()
        if (rect.bottom > 0) setHeroScrollY(window.scrollY)
      }
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const el = featureSectionRef.current
    if (!el) return
    const io = new IntersectionObserver(
      ([e]) => setFeatureVisible(e.isIntersecting),
      { threshold: 0.1 }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <main className={contactFont.className}>
      <div className="min-h-screen bg-[#0F172A] text-white">
        <section
          id="hero"
          ref={heroRef}
          className="relative flex flex-col items-center p-6 overflow-hidden"
        >
          <div
            className="absolute inset-0 opacity-40 transition-transform duration-100"
            style={{
              background: 'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(13,148,136,0.25) 0%, transparent 60%)',
              transform: `translateY(${heroScrollY * 0.25}px)`,
            }}
          />
          <div className="relative z-10 max-w-4xl mx-auto text-center">
            <img
              src="/banner.png"
              alt="JongMe Banner"
              style={{
                width: '100%',
                borderRadius: '16px',
                display: 'block',
              }}
            />
            <button
              type="button"
              onClick={() => router.push('/admin/register?trial=true')}
              className="inline-block mt-6 px-8 py-4 rounded-xl font-semibold text-white transition-all hover:scale-105 hover:shadow-lg"
              style={{ backgroundColor: '#0D9488', boxShadow: '0 0 30px rgba(13,148,136,0.4)' }}
            >
              ทดลองใช้ฟรี 15 วัน
            </button>

            <h2 className="text-3xl sm:text-4xl font-bold text-center mt-10 mb-2">ทำไมต้องเลือก JongMe</h2>
            <p className="text-slate-400 text-center max-w-2xl mx-auto mb-1">
              ถ้าคุณอยาก &quot;หยุดตอบแชทซ้ำๆ แล้วเอาเวลาไปดูแลลูกค้าให้เต็มที่&quot; JongMe คือเครื่องมือที่จะเปลี่ยนชีวิตเจ้าของร้านให้ง่ายขึ้นครับ
            </p>
            <p className="text-slate-500 text-xs text-center italic mb-0">(JongMe Contract)</p>
            <div
              ref={statsInView.ref}
              className="max-w-md mx-auto"
              style={{ marginTop: 24 }}
            >
              <div
                className="p-5 rounded-xl border border-slate-600/50 bg-[#1E293B]/80 backdrop-blur hover:border-[#0D9488]/50 hover:shadow-lg hover:shadow-[#0D9488]/10 transition-all duration-500"
                style={{
                  opacity: statsInView.visible ? 1 : 0,
                  transform: statsInView.visible ? 'translateY(0)' : 'translateY(20px)',
                  transitionDelay: '0ms',
                }}
              >
                <span className="text-2xl mb-2 block">📱</span>
                <span className="text-xl sm:text-2xl font-bold block mb-0.5" style={{ color: '#0D9488' }}>
                  จองผ่าน LINE 100%
                </span>
                <span className="text-slate-300 text-sm block mb-2">(No App Required)</span>
                <span className="text-slate-400 text-sm block mb-1">ลูกค้าจองง่าย... ไม่ต้องโหลดแอปเพิ่ม</span>
                <span className="text-slate-500 text-xs italic">สะดวกลูกค้า ถูกใจเจ้าของร้าน</span>
              </div>
            </div>
          </div>
        </section>

        <section id="features" ref={featureSectionRef} className="bg-[#0F172A] pt-6 pb-6 px-0">
          <div className="max-w-6xl mx-auto px-6">
            <div className="flex gap-4 overflow-x-auto pb-2 -mx-2 px-2 snap-x snap-mandatory">
              {[
                { icon: '📱', title: 'จองผ่าน LINE 100% (No App Required)', desc: 'ลูกค้าจองง่าย... ไม่ต้องโหลดแอปเพิ่ม', tag: 'สะดวกลูกค้า ถูกใจเจ้าของร้าน (JongMe Contract)' },
                { icon: '🔔', title: 'แก้ปัญหา No-Show ด้วยระบบเตือนอัจฉริยะ', desc: 'การที่ลูกค้าจองแล้วไม่มาคือความสูญเสีย JongMe มีระบบ Auto-Notification ส่งข้อความเตือนลูกค้าผ่าน LINE ก่อนถึงเวลานัด ช่วยลดการลืมนัดได้มากกว่า 90% และทำให้ร้านบริหารจัดการคิวได้อย่างแม่นยำ', tag: '(JongMe Contract)' },
                { icon: '💰', title: 'เริ่มต้นฟรี และเติบโตไปพร้อมกัน', desc: '⚙️ ตั้งค่าง่าย ภายใน 5 นาที รองรับ LINE OA ทุกร้าน\n\nเราเข้าใจคนทำธุรกิจ JongMe มีแผนให้ทดลองใช้ฟรีเพื่อให้คุณมั่นใจก่อน และเมื่อธุรกิจคุณขยาย แพ็กเกจพรีเมียมของเราก็เริ่มต้นเพียงหลักร้อยต่อเดือน (เฉลี่ยวันละไม่ถึง 10 บาท) ซึ่งคุ้มค่ากว่าการจ้างแอดมินหนึ่งคนหลายเท่าตัว!', tag: '(JongMe Contract)' },
                { icon: '⚡', title: 'ลดงานแอดมิน 80%', desc: 'ปล่อยให้ระบบทำงานแทน เบื่อไหมกับการต้องคอยตอบ "กี่โมงว่างคะ?" "ช่างคนนี้ว่างไหม?" JongMe จะโชว์ตารางว่างแบบ Real-time ให้ลูกค้าเลือกเอง ระบบจะจดคิวลงตารางให้อัตโนมัติ คุณแค่เปิดดูตอนเช้าทีเดียวว่าวันนี้มีกี่คิว', tag: '(JongMe Contract)' },
              ].map((f, i) => (
                <div
                  key={f.title}
                  className="min-w-[260px] sm:min-w-[280px] lg:min-w-[260px] p-6 rounded-2xl bg-[#1E293B] border border-slate-600/30 hover:border-[#0D9488]/40 hover:shadow-xl hover:shadow-[#0D9488]/5 hover:-translate-y-1 transition-all duration-500 snap-center"
                  style={{
                    opacity: featureVisible ? 1 : 0,
                    transform: featureVisible ? 'translateY(0)' : 'translateY(32px)',
                    transitionDelay: `${i * 100}ms`,
                  }}
                >
                  <span className="text-3xl mb-3 block">{f.icon}</span>
                  <h3 className="text-lg font-semibold mb-2" style={{ color: '#0D9488' }}>
                    {f.title}
                  </h3>
                  <p className="text-slate-400 text-sm whitespace-pre-line">{f.desc}</p>
                  {'tag' in f && f.tag && (
                    <p className="text-slate-500 text-xs mt-2 italic">{f.tag}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {false && (
          <section id="video" className="py-24 px-4 bg-[#1a2332]">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl sm:text-4xl font-bold text-center mb-2">
                ดูวิธีการทำงานของ JongMe
              </h2>
              <p className="text-slate-400 text-center mb-12">
                ตั้งค่าง่าย ใช้งานได้ภายใน 5 นาที
              </p>
              <div
                className="relative w-full max-w-[800px] mx-auto rounded-2xl overflow-hidden transition-all duration-300"
                style={{
                  aspectRatio: '16/9',
                  boxShadow: '0 0 40px rgba(13,148,136,0.25)',
                  border: '2px solid rgba(13,148,136,0.4)',
                }}
              >
                {!videoPlaying ? (
                  <button
                    type="button"
                    onClick={() => setVideoPlaying(true)}
                    className="absolute inset-0 w-full h-full flex items-center justify-center bg-[#0F172A] hover:bg-[#1E293B] transition-colors group"
                  >
                    <div
                      className="w-20 h-20 rounded-full flex items-center justify-center transition-transform group-hover:scale-110"
                      style={{
                        backgroundColor: 'rgba(13,148,136,0.9)',
                        boxShadow: '0 0 40px rgba(13,148,136,0.5)',
                      }}
                    >
                      <svg
                        className="w-10 h-10 text-white ml-1"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  </button>
                ) : (
                  <div className="w-full h-full bg-black">
                    <video
                      src=""
                      controls
                      className="w-full h-full object-contain"
                      playsInline
                    />
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        <section id="pricing" className="py-24 px-4 bg-[#0F172A]">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-bold text-center mb-2">
              ราคาที่คุ้มค่า ไม่มีค่าใช้จ่ายซ่อนเร้น
            </h2>
            <p className="text-slate-400 text-center mb-6">เริ่มต้นใช้งานได้ทันที ไม่ต้องใส่บัตรเครดิต</p>
            <div className="text-center mb-8">
              <a
                href="#contact"
                className="inline-block px-8 py-4 rounded-xl font-semibold text-white transition-all hover:scale-105 hover:shadow-lg"
                style={{ backgroundColor: '#0D9488', boxShadow: '0 0 30px rgba(13,148,136,0.4)' }}
              >
                เริ่มใช้งาน JongMe เลย
              </a>
            </div>
            <div className="grid grid-cols-2 gap-6">
              {[
                { id: 'just_start', name: 'Just Start', price: '฿499', period: '/เดือน', duration: 'ระยะเวลา 1 เดือน', badge: 'เริ่มต้น', highlight: false },
                { id: 'step_up', name: 'Step Up', price: '฿1,390', period: '', sub: '(฿463/เดือน)', duration: 'ระยะเวลา 3 เดือน', badge: 'ประหยัด 7%', highlight: false },
                { id: 'keep_going', name: 'Keep Going', price: '฿2,990', period: '', sub: '(฿498/เดือน)', duration: 'ระยะเวลา 6 เดือน', badge: 'แนะนำ', highlight: true },
                { id: 'together', name: 'Together', price: '฿4,990', period: '', sub: '(฿415/เดือน)', duration: 'ระยะเวลา 12 เดือน', badge: 'ประหยัดสูงสุด 17%', highlight: false },
              ].map((p) => (
                <div
                  key={p.id}
                  className={`relative p-6 rounded-2xl border transition-all duration-300 ${
                    p.highlight
                      ? 'bg-[#1E293B] border-[#0D9488] shadow-lg shadow-[#0D9488]/20 lg:scale-105 z-10 hover:-translate-y-2 hover:shadow-xl hover:shadow-[#0D9488]/30'
                      : 'bg-[#1E293B] border-slate-600/30 hover:border-slate-500/50 hover:-translate-y-2 hover:shadow-xl hover:shadow-[#0D9488]/10'
                  }`}
                >
                  <span
                    className={`absolute -top-2.5 right-4 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      p.highlight ? 'bg-[#0D9488] text-white' : 'bg-slate-600 text-slate-200'
                    }`}
                  >
                    {p.badge}
                  </span>
                  <h3 className="text-lg font-semibold mb-4">{p.name}</h3>
                  <div className="mb-2">
                    <span className="text-2xl font-bold">{p.price}</span>
                    <span className="text-slate-400">{p.period}</span>
                  </div>
                  {p.sub && <p className="text-sm text-slate-400 mb-2">{p.sub}</p>}
                  <p className="text-slate-300 text-sm mb-4">{p.duration}</p>
                  <p className="text-slate-400 text-sm mb-4">ไม่จำกัดฟังก์ชัน</p>
                  <button
                    type="button"
                    onClick={() => router.push(`/admin/register?package=${encodeURIComponent(p.id)}`)}
                    className="mt-2 w-full rounded-xl bg-[#0D9488] hover:bg-[#0F766E] text-white text-sm font-semibold py-2.5 transition-colors"
                  >
                    เลือกแพ็คเกจนี้
                  </button>
                </div>
              ))}
            </div>
            <p className="text-slate-400 text-center mt-8 text-sm">
              ทุกแพ็คเกจรวมฟีเจอร์ครบทุกอย่าง ไม่มีค่าใช้จ่ายเพิ่มเติม
            </p>
          </div>
        </section>

        <section id="contact" className="pt-2 pb-16 px-4 bg-[#0F172A]">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-bold text-center mb-10">ติดต่อเรา</h2>
            <div className="rounded-t-2xl bg-[#020617] border border-slate-700/60 px-6 py-6 sm:px-10 sm:py-8">
              <div className="mb-6">
                <p className="text-sm text-teal-400 tracking-wide uppercase mb-1">JongMe Booking Platform</p>
                <p className="text-sm text-slate-400 max-w-xl">
                  ระบบจองคิวผ่าน LINE สำหรับร้านตัดผม ร้านเสริมสวย คลินิก และธุรกิจบริการที่ต้องการจัดการคิวแบบมืออาชีพ
                </p>
              </div>
              <div className="space-y-4 text-sm">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 text-lg">📍</span>
                  <p className="text-slate-300">
                    กรุงเทพฯ ประเทศไทย
                    <br />
                    ให้บริการทั่วประเทศผ่านระบบออนไลน์
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-lg">📞</span>
                  <p className="text-slate-300">092-292-6495</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-lg">📧</span>
                  <p className="text-slate-300 break-all">jongme.help@gmail.com</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-lg">💬</span>
                  <p className="text-slate-300">@jongme (LINE Official Account)</p>
                </div>
              </div>
            </div>
            <div className="rounded-b-2xl bg-[#020617] border-x border-b border-slate-700/60 px-6 py-4 sm:px-10 flex flex-col sm:flex-row items-center justify-between gap-3">
              <span className="font-semibold text-teal-400">JongMe</span>
              <span className="text-xs text-slate-500">© 2026 JongMe Booking Platform</span>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
