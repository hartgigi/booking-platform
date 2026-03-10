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
  },
  {
    title: "เลือก Provider และ Channel",
    description:
      "กด Provider ของคุณ → เลือก Messaging API Channel ของร้าน",
  },
  {
    title: "เปิดใช้งาน Webhook",
    description:
      "ไปที่แท็บ Messaging API → ตั้งค่า Webhook URL → วาง URL จากระบบ → กด Verify",
  },
  {
    title: "คัดลอก Channel Access Token",
    description:
      "กด Issue ที่ Channel Access Token → Copy token → วางในช่อง Channel Access Token ในระบบ",
  },
  {
    title: "คัดลอก Channel Secret",
    description:
      "ไปที่แท็บ Basic settings → Copy Channel Secret → วางในช่อง Channel Secret ในระบบ",
  },
  {
    title: "ทดสอบและสร้าง Rich Menu",
    description:
      "กลับมาที่ระบบ → กด ทดสอบ → ถ้าขึ้น ✅ เชื่อมต่อสำเร็จ → กด สร้าง Rich Menu",
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
                  <div className="mt-3 text-[12px]">
                    {index === 0 && (
                      <div className="rounded-lg border border-slate-200 bg-[#1a1a2e] p-3 min-h-[80px] text-slate-50">
                        <div className="flex items-center justify-between rounded-md bg-emerald-700 px-3 py-1 mb-2 text-[11px]">
                          <span>LINE Developers</span>
                          <span className="opacity-80">developers.line.biz</span>
                        </div>
                        <p className="text-[12px]">
                          Log in → เลือก Provider → เลือก Channel
                        </p>
                      </div>
                    )}
                    {index === 1 && (
                      <div className="rounded-lg border border-slate-200 bg-[#f8f9fa] p-3 min-h-[80px]">
                        <div className="flex gap-1 text-[11px] mb-2">
                          <div className="px-3 py-1 rounded-md bg-slate-200 text-slate-700">
                            Basic settings
                          </div>
                          <div className="px-3 py-1 rounded-md bg-emerald-600 text-white font-semibold">
                            Messaging API
                          </div>
                          <div className="px-3 py-1 rounded-md bg-slate-200 text-slate-700">
                            LIFF
                          </div>
                          <div className="px-3 py-1 rounded-md bg-slate-200 text-slate-700">
                            Security
                          </div>
                        </div>
                        <p className="text-[12px] text-slate-700">
                          เลือกแท็บ <span className="font-semibold">Messaging API</span> เพื่อดูการตั้งค่า Webhook และ Token
                        </p>
                      </div>
                    )}
                    {index === 2 && (
                      <div className="rounded-lg border border-slate-200 bg-[#f8f9fa] p-3 min-h-[80px]">
                        <label className="block text-[11px] font-medium text-slate-700 mb-1">
                          Webhook URL
                        </label>
                        <div className="flex flex-col gap-2">
                          <input
                            type="text"
                            readOnly
                            value="https://www.jongme.com/api/webhook/line/..."
                            className="w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] text-slate-800"
                          />
                          <div className="flex items-center gap-2">
                            <button className="px-3 py-1 rounded-md bg-emerald-600 text-white text-[11px]">
                              Verify
                            </button>
                            <button className="px-3 py-1 rounded-md border border-slate-300 text-[11px] text-slate-700 bg-white">
                              Edit
                            </button>
                            <div className="ml-auto flex items-center gap-1 text-[11px] text-slate-700">
                              <span>Use webhook</span>
                              <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500" />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    {index === 3 && (
                      <div className="rounded-lg border border-slate-200 bg-[#f8f9fa] p-3 min-h-[80px]">
                        <label className="block text-[11px] font-medium text-slate-700 mb-1">
                          Channel access token (long-lived)
                        </label>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-[14px] tracking-[0.2em] text-slate-500">
                            ••••••••••••••••••••••••••••••
                          </div>
                          <button className="px-3 py-1 rounded-md bg-emerald-600 text-white text-[11px]">
                            Issue
                          </button>
                        </div>
                      </div>
                    )}
                    {index === 4 && (
                      <div className="rounded-lg border border-slate-200 bg-[#f8f9fa] p-3 min-h-[80px]">
                        <div className="flex gap-1 text-[11px] mb-2">
                          <div className="px-3 py-1 rounded-md bg-emerald-600 text-white font-semibold">
                            Basic settings
                          </div>
                          <div className="px-3 py-1 rounded-md bg-slate-200 text-slate-700">
                            Messaging API
                          </div>
                        </div>
                        <label className="block text-[11px] font-medium text-slate-700 mb-1">
                          Channel secret
                        </label>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-[14px] tracking-[0.3em] text-slate-500">
                            ••••••••••••••••
                          </div>
                          <button className="px-2.5 py-1 rounded-md border border-slate-300 bg-white text-[11px] text-slate-700">
                            ⧉
                          </button>
                        </div>
                      </div>
                    )}
                    {index === 5 && (
                      <div className="rounded-lg border border-slate-200 bg-[#f8f9fa] p-3 min-h-[80px]">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-lg">✅</span>
                          <span className="text-[12px] font-medium text-emerald-700">
                            เชื่อมต่อสำเร็จ
                          </span>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2">
                          <div className="flex-1 rounded-md border border-slate-200 bg-white px-3 py-2 text-[11px] text-slate-700">
                            ระบบเชื่อมต่อกับ LINE OA แล้ว ตอนนี้คุณสามารถสร้าง Rich Menu เพื่อให้ลูกค้าจองคิวผ่าน LINE ได้
                          </div>
                          <button className="px-3 py-1.5 rounded-md bg-teal-600 text-white text-[11px] whitespace-nowrap">
                            สร้าง Rich Menu
                          </button>
                        </div>
                      </div>
                    )}
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

