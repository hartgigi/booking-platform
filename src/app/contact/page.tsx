'use client'

import { IBM_Plex_Sans_Thai } from 'next/font/google'
import { useState, useEffect, useRef } from 'react'

const ibmPlexSansThai = IBM_Plex_Sans_Thai({
  weight: ['300', '400', '500', '600', '700'],
  subsets: ['thai', 'latin'],
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
  const [heroMounted, setHeroMounted] = useState(false)
  const [heroScrollY, setHeroScrollY] = useState(0)
  const heroRef = useRef<HTMLElement>(null)
  const statsInView = useInView(0.3)
  const stat1 = useCountUp(100, statsInView.visible)
  const stat2 = useCountUp(5, statsInView.visible)
  const stat3 = useCountUp(1, statsInView.visible)
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

  const stats = [
    { label: 'ไม่จำกัดฟังก์ชัน', icon: '✨', value: stat1, suffix: '%' },
    { label: 'ตั้งค่าง่าย', icon: '⚙️', value: stat2, suffix: ' นาที' },
    { label: 'รองรับ LINE OA', icon: '💬', value: stat3, suffix: ' แอป' },
  ]

  return (
    <div className={ibmPlexSansThai.className} style={{ fontFamily: '"IBM Plex Sans Thai", sans-serif' }}>
      <div className="min-h-screen bg-[#0F172A] text-white">
        <section
          id="hero"
          ref={heroRef}
          className="relative min-h-screen flex flex-col items-center justify-center px-4 py-20 overflow-hidden"
        >
          <div
            className="absolute inset-0 opacity-40 transition-transform duration-100"
            style={{
              background: 'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(13,148,136,0.25) 0%, transparent 60%)',
              transform: `translateY(${heroScrollY * 0.25}px)`,
            }}
          />
          <div className="relative z-10 max-w-4xl mx-auto text-center">
            <h1
              className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight mb-6 transition-all duration-700"
              style={{
                opacity: heroMounted ? 1 : 0,
                transform: heroMounted ? 'translateY(0)' : 'translateY(24px)',
                transitionDelay: '0ms',
              }}
            >
              ระบบจองคิวอัจฉริยะ สำหรับร้านของคุณ
            </h1>
            <p
              className="text-lg sm:text-xl text-slate-300 mb-10 max-w-2xl mx-auto transition-all duration-700"
              style={{
                opacity: heroMounted ? 1 : 0,
                transform: heroMounted ? 'translateY(0)' : 'translateY(24px)',
                transitionDelay: `${HERO_STAGGER}ms`,
              }}
            >
              เพิ่มยอดจอง ลดการ No-show จัดการร้านได้ง่ายๆ ผ่าน LINE
            </p>
            <a
              href="#pricing"
              className="inline-block px-8 py-4 rounded-xl font-semibold text-white transition-all duration-700 hover:scale-105 hover:shadow-lg"
              style={{
                backgroundColor: '#0D9488',
                boxShadow: '0 0 30px rgba(13,148,136,0.4)',
                opacity: heroMounted ? 1 : 0,
                transform: heroMounted ? 'translateY(0)' : 'translateY(24px)',
                transitionDelay: `${HERO_STAGGER * 2}ms`,
              }}
            >
              ทดลองใช้ฟรี 15 วัน
            </a>
            <div
              ref={statsInView.ref}
              className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-16 max-w-3xl mx-auto"
            >
              {stats.map((item, i) => (
                <div
                  key={item.label}
                  className="p-5 rounded-xl border border-slate-600/50 bg-[#1E293B]/80 backdrop-blur hover:border-[#0D9488]/50 hover:shadow-lg hover:shadow-[#0D9488]/10 transition-all duration-500"
                  style={{
                    opacity: statsInView.visible ? 1 : 0,
                    transform: statsInView.visible ? 'translateY(0)' : 'translateY(20px)',
                    transitionDelay: `${i * 80}ms`,
                  }}
                >
                  <span className="text-2xl mb-2 block">{item.icon}</span>
                  <span className="text-2xl font-bold block mb-1" style={{ color: '#0D9488' }}>
                    {item.value}{item.suffix}
                  </span>
                  <span className="text-slate-200 font-medium">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="features" ref={featureSectionRef} className="py-24 px-4 bg-[#0F172A]">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-bold text-center mb-2">ทำไมต้องเลือก JongMe</h2>
            <p className="text-slate-400 text-center max-w-2xl mx-auto mb-1">
              ถ้าคุณอยาก &quot;หยุดตอบแชทซ้ำๆ แล้วเอาเวลาไปดูแลลูกค้าให้เต็มที่&quot; JongMe คือเครื่องมือที่จะเปลี่ยนชีวิตเจ้าของร้านให้ง่ายขึ้นครับ
            </p>
            <p className="text-slate-500 text-xs text-center italic mb-12">(JongMe Contract)</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-12">
              {[
                { icon: '📱', title: 'จองผ่าน LINE 100% (No App Required)', desc: 'ลูกค้าจองง่าย... ไม่ต้องโหลดแอปเพิ่ม', tag: 'สะดวกลูกค้า ถูกใจเจ้าของร้าน (JongMe Contract)' },
                { icon: '🔔', title: 'แก้ปัญหา No-Show ด้วยระบบเตือนอัจฉริยะ', desc: 'การที่ลูกค้าจองแล้วไม่มาคือความสูญเสีย JongMe มีระบบ Auto-Notification ส่งข้อความเตือนลูกค้าผ่าน LINE ก่อนถึงเวลานัด ช่วยลดการลืมนัดได้มากกว่า 90% และทำให้ร้านบริหารจัดการคิวได้อย่างแม่นยำ', tag: '(JongMe Contract)' },
                { icon: '💰', title: 'เริ่มต้นฟรี และเติบโตไปพร้อมกัน', desc: 'เราเข้าใจคนทำธุรกิจ JongMe มีแผนให้ทดลองใช้ฟรีเพื่อให้คุณมั่นใจก่อน และเมื่อธุรกิจคุณขยาย แพ็กเกจพรีเมียมของเราก็เริ่มต้นเพียงหลักร้อยต่อเดือน (เฉลี่ยวันละไม่ถึง 10 บาท) ซึ่งคุ้มค่ากว่าการจ้างแอดมินหนึ่งคนหลายเท่าตัว!', tag: '(JongMe Contract)' },
                { icon: '⚡', title: 'ลดงานแอดมิน 80%', desc: 'ปล่อยให้ระบบทำงานแทน เบื่อไหมกับการต้องคอยตอบ "กี่โมงว่างคะ?" "ช่างคนนี้ว่างไหม?" JongMe จะโชว์ตารางว่างแบบ Real-time ให้ลูกค้าเลือกเอง ระบบจะจดคิวลงตารางให้อัตโนมัติ คุณแค่เปิดดูตอนเช้าทีเดียวว่าวันนี้มีกี่คิว', tag: '(JongMe Contract)' },
              ].map((f, i) => (
                <div
                  key={f.title}
                  className="p-6 rounded-2xl bg-[#1E293B] border border-slate-600/30 hover:border-[#0D9488]/40 hover:shadow-xl hover:shadow-[#0D9488]/5 hover:-translate-y-1 transition-all duration-500"
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
                  <p className="text-slate-400 text-sm">{f.desc}</p>
                  {'tag' in f && f.tag && (
                    <p className="text-slate-500 text-xs mt-2 italic">{f.tag}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

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

        <section id="pricing" className="py-24 px-4 bg-[#0F172A]">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-bold text-center mb-2">
              ราคาที่คุ้มค่า ไม่มีค่าใช้จ่ายซ่อนเร้น
            </h2>
            <p className="text-slate-400 text-center mb-6">ทดลองใช้ฟรี 15 วัน ไม่ต้องใส่บัตรเครดิต</p>
            <div className="text-center mb-8">
              <a
                href="#contact"
                className="inline-block px-8 py-4 rounded-xl font-semibold text-white transition-all hover:scale-105 hover:shadow-lg"
                style={{ backgroundColor: '#0D9488', boxShadow: '0 0 30px rgba(13,148,136,0.4)' }}
              >
                ทดลองใช้ฟรี 15 วัน เริ่มเลย
              </a>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { name: 'Just Start', price: '฿499', period: '/เดือน', duration: 'ระยะเวลา 1 เดือน', badge: 'เริ่มต้น', highlight: false },
                { name: 'Step Up', price: '฿1,390', period: '', sub: '(฿463/เดือน)', duration: 'ระยะเวลา 3 เดือน', badge: 'ประหยัด 7%', highlight: false },
                { name: 'Keep Going', price: '฿2,990', period: '', sub: '(฿498/เดือน)', duration: 'ระยะเวลา 6 เดือน', badge: 'แนะนำ', highlight: true },
                { name: 'Together', price: '฿4,990', period: '', sub: '(฿415/เดือน)', duration: 'ระยะเวลา 12 เดือน', badge: 'ประหยัดสูงสุด 17%', highlight: false },
              ].map((p) => (
                <div
                  key={p.name}
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
                  <p className="text-slate-400 text-sm">ไม่จำกัดฟังก์ชัน</p>
                </div>
              ))}
            </div>
            <p className="text-slate-400 text-center mt-8 text-sm">
              ทุกแพ็คเกจรวมฟีเจอร์ครบทุกอย่าง ไม่มีค่าใช้จ่ายเพิ่มเติม
            </p>
            <div className="text-center mt-8">
              <a
                href="#contact"
                className="inline-block px-8 py-4 rounded-xl font-semibold text-white transition-all hover:scale-105 hover:shadow-lg"
                style={{ backgroundColor: '#0D9488', boxShadow: '0 0 30px rgba(13,148,136,0.4)' }}
              >
                ทดลองใช้ฟรี 15 วัน เริ่มเลย
              </a>
            </div>
          </div>
        </section>

        <section id="contact" className="py-24 px-4 bg-[#0F172A]">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-bold text-center mb-12">ติดต่อเรา</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { icon: '📞', label: 'โทรศัพท์', value: '092-292-6495' },
                { icon: '📧', label: 'อีเมล', value: 'jongme.help@gmail.com' },
                { icon: '💬', label: 'LINE ID', value: '@jongme' },
              ].map((c) => (
                <div
                  key={c.label}
                  className="p-6 rounded-2xl bg-[#1E293B] border border-slate-600/30 hover:border-[#0D9488]/40 transition-all"
                >
                  <span className="text-2xl mb-2 block">{c.icon}</span>
                  <p className="text-slate-400 text-sm mb-1">{c.label}</p>
                  <p className="font-medium break-all">{c.value}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <footer className="py-8 px-4 bg-[#0F172A] border-t border-slate-700/50">
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <span className="font-semibold" style={{ color: '#0D9488' }}>
              JongMe
            </span>
            <span className="text-slate-500 text-sm">© 2026</span>
          </div>
        </footer>
      </div>
    </div>
  )
}
