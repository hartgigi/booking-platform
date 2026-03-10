"use client"

import { createPortal } from "react-dom"

interface LineGuideProps {
  open: boolean
  onClose: () => void
}

const STEPS = [
  {
    title: "เข้า LINE Developers Console",
    description:
      "ไปที่ https://developers.line.biz แล้ว Login ด้วยบัญชี LINE ของคุณ",
    placeholder: "ภาพ: หน้า LINE Developers",
  },
  {
    title: "เลือก Provider และ Channel",
    description:
      "กด Provider ของคุณ → เลือก Messaging API Channel ของร้าน",
    placeholder: "ภาพ: เลือก Channel",
  },
  {
    title: "เปิดใช้งาน Webhook",
    description:
      "ไปที่แท็บ Messaging API → ตั้งค่า Webhook URL → วาง URL จากระบบ → กด Verify",
    placeholder: "ภาพ: ตั้งค่า Webhook",
  },
  {
    title: "คัดลอก Channel Access Token",
    description:
      "กด Issue ที่ Channel Access Token → Copy token → วางในช่อง Channel Access Token ในระบบ",
    placeholder: "ภาพ: Channel Access Token",
  },
  {
    title: "คัดลอก Channel Secret",
    description:
      "ไปที่แท็บ Basic settings → Copy Channel Secret → วางในช่อง Channel Secret ในระบบ",
    placeholder: "ภาพ: Channel Secret",
  },
  {
    title: "ทดสอบและสร้าง Rich Menu",
    description:
      "กลับมาที่ระบบ → กด ทดสอบ → ถ้าขึ้น ✅ เชื่อมต่อสำเร็จ → กด สร้าง Rich Menu",
    placeholder: "ภาพ: ทดสอบการเชื่อมต่อ",
  },
]

export function LineGuide({ open, onClose }: LineGuideProps) {
  if (typeof document === "undefined") return null
  if (!open) return null

  const content = (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl border border-slate-200 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
          <h2 className="text-sm font-semibold text-slate-900">
            วิธีเชื่อมต่อ LINE OA เข้ากับ JongMe
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full w-7 h-7 flex items-center justify-center text-slate-500 hover:bg-slate-100 text-sm"
          >
            ×
          </button>
        </div>
        <div className="px-4 pt-3 pb-4 overflow-y-auto space-y-4">
          {STEPS.map((step, index) => (
            <div
              key={step.title}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3"
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5">
                  <div className="w-7 h-7 rounded-full bg-teal-600 text-white flex items-center justify-center text-xs font-semibold">
                    {index + 1}
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-slate-900 mb-1">
                    {step.title}
                  </h3>
                  <p className="text-xs text-slate-600">
                    {step.description}
                  </p>
                  <div className="mt-3 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-8 flex items-center justify-center">
                    <span className="text-[11px] text-slate-500">
                      {step.placeholder}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-1">
            <button
              type="button"
              onClick={() => {
                window.open("https://developers.line.biz", "_blank", "noopener,noreferrer")
              }}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-teal-600 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-700 shadow-sm"
            >
              ไปที่ LINE Developers
            </button>
            <button
              type="button"
              onClick={onClose}
              className="text-xs text-slate-500 hover:text-slate-700"
            >
              ปิดหน้าต่างนี้
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  return createPortal(content, document.body)
}

