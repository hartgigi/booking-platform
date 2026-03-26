"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

interface LineGuideProps {
  open: boolean;
  onClose: () => void;
  webhookUrl: string;
}

const GUIDE_IMAGE_DIR = "/images/line-oa-guide";

type GuideTrack = "from_zero" | "connect_only";

type GuideStep = {
  /** ถ้ามี = แสดงรูปจาก public/images/line-oa-guide/ (ใช้เฉพาะส่วนเชื่อมต่อ) */
  file?: string;
  title: string;
  lines: string[];
  tip?: string;
};

/** ส่วน ก — สร้าง LINE OA (ข้อความอย่างเดียว ไม่มีรูปในระบบ) */
const STEPS_CREATE_OA: GuideStep[] = [
  {
    title: "ขั้นตอนที่ 1: เข้าสู่ LINE Official Account Manager",
    lines: [
      "เปิด https://manager.line.biz/ (หรือแอป LINE Official Account)",
      "ล็อกอินด้วยบัญชี LINE ที่ต้องการใช้ดูแล OA ร้าน",
      "หากระบบถามยืนยันสิทธิ์/เงื่อนไข ให้กดยอมรับให้ครบ",
    ],
    tip: "ผลลัพธ์ที่ควรเห็น: เข้าหน้าจัดการ OA ได้สำเร็จ",
  },
  {
    title: "ขั้นตอนที่ 2: สร้างบัญชี OA ใหม่",
    lines: [
      "กดปุ่มสร้างบัญชีทางการ / Create / เพิ่มบัญชี (ชื่อปุ่มอาจต่างกัน)",
      "กรอกข้อมูลร้าน เช่น ชื่อร้าน ประเภทธุรกิจ และข้อมูลพื้นฐานให้ครบ",
      "กดถัดไปตามขั้นตอนจนระบบแจ้งว่าสร้าง OA สำเร็จ",
    ],
    tip: "ผลลัพธ์ที่ควรเห็น: มี OA ร้านของคุณใน LINE OA Manager",
  },
  {
    title: "ขั้นตอนที่ 3: ตรวจสอบ OA หลังสร้างเสร็จ",
    lines: [
      "ตรวจสอบว่าเข้าแดชบอร์ด OA ร้านได้",
      "ทดสอบ Add friend/เปิดแชท OA ได้ตามปกติ",
      "จดชื่อ OA ร้านไว้ เพื่อใช้ตรวจสอบตอนเชื่อมกับ Developers",
    ],
    tip: "หากยัง Add friend ไม่ได้ ให้แก้ตรง OA ให้เรียบร้อยก่อนค่อยไปขั้นถัดไป",
  },
  {
    title: "ขั้นตอนที่ 4: เข้า LINE Developers และสร้าง Provider",
    lines: [
      "เปิด https://developers.line.biz/console/ แล้วล็อกอิน",
      "ถ้ายังไม่มี Provider ให้กด Create Provider",
      "ตั้งชื่อ Provider (เช่น ชื่อร้าน/ชื่อทีม) แล้วกดบันทึก",
    ],
    tip: "แนะนำใช้บัญชี LINE เดียวกับที่สร้าง OA เพื่อลดปัญหาไม่เห็น Channel",
  },
  {
    title: "ขั้นตอนที่ 5: ตรวจสอบ Channel ของ OA ใน Console",
    lines: [
      "เข้า Provider แล้วดูว่ามี Channel ของ OA ร้าน (Messaging API / Official Account)",
      "ถ้ายังไม่เห็น ให้กด Add / Create เพื่อเชื่อม OA เข้ากับ Provider",
      "เมื่อเห็นแล้ว ให้กดเข้า Channel นั้นเพื่อทำการเชื่อมต่อ JongMe ต่อ",
    ],
    tip: "ผลลัพธ์ที่ควรเห็น: เข้าไปหน้า Channel ของ OA ร้านได้",
  },
];

/** ส่วน ข — เชื่อมต่อ JongMe (มีรูปขั้น 1–6; ขั้น 7 ข้อความอย่างเดียว) */
const STEPS_CONNECT: GuideStep[] = [
  {
    file: "01-console-home.png",
    title: "เชื่อมต่อ JongMe — ขั้นที่ 1: เข้า LINE Developers Console",
    lines: [
      "เปิด developers.line.biz/console แล้วล็อกอิน",
      "เลือก Provider ของร้านที่ต้องการเชื่อม",
      "เลือก Channel ของ OA ร้าน (Messaging API)",
    ],
    tip: "ต้องเข้าให้ถูก Provider ก่อน ถ้าผิดจะหา Channel ไม่เจอ",
  },
  {
    file: "02-channel-list.png",
    title: "เชื่อมต่อ JongMe — ขั้นที่ 2: เลือก Channel ให้ถูกต้อง",
    lines: [
      "เลือก Channel ที่ลูกค้าใช้ทักแชท OA ร้านจริง",
      "อย่าเลือก Channel ที่เป็น LINE Login ของระบบอื่น",
      "ตรวจชื่อ Channel ให้ตรงกับ OA ร้านของคุณ",
    ],
    tip: "ถ้ามีหลาย channel ให้เลือกตัวที่เป็น OA ร้านคุณ",
  },
  {
    file: "03-open-messaging-api-tab.png",
    title: "เชื่อมต่อ JongMe — ขั้นที่ 3: เปิดแท็บที่ต้องใช้",
    lines: [
      "เมื่อเข้า Channel แล้ว ให้เตรียมใช้งาน 2 แท็บ: Basic settings และ Messaging API",
      "ขั้นตอนนี้ยังไม่ต้องตั้งค่า LIFF",
      "ตรวจว่าคุณอยู่ใน Channel เดิมตลอดขั้นตอน",
    ],
  },
  {
    file: "04-basic-settings-secret.png",
    title: "เชื่อมต่อ JongMe — ขั้นที่ 4: คัดลอก Channel secret",
    lines: [
      "เปิดแท็บ Basic settings",
      "หา Channel secret แล้วกดแสดงค่า/คัดลอก",
      "กลับไปหน้า ตั้งค่าร้าน ของ JongMe แล้ววางในช่อง Channel Secret",
      "อย่าเผลอคัดลอกจาก Channel อื่น",
    ],
    tip: "Secret กับ Channel ต้องเป็นคู่เดียวกัน",
  },
  {
    file: "05-messaging-api-webhook.png",
    title: "เชื่อมต่อ JongMe — ขั้นที่ 5: ตั้งค่า Webhook",
    lines: [
      "เปิดแท็บ Messaging API",
      "เปิด Use webhook เป็น ON",
      "คัดลอก Webhook URL จากหน้า JongMe แล้ววางใน LINE",
      "กด Update (ถ้ามี) แล้วกด Verify ให้ผ่าน",
      "ถ้า Verify ไม่ผ่าน ให้ตรวจ URL และ Channel secret อีกครั้ง",
    ],
    tip: "URL ต้องตรงทุกตัวอักษรกับที่ JongMe แสดง",
  },
  {
    file: "06-messaging-api-token.png",
    title: "เชื่อมต่อ JongMe — ขั้นที่ 6: สร้าง Channel access token",
    lines: [
      "อยู่ในแท็บ Messaging API",
      "หา Channel access token (long-lived) → กด Issue",
      "คัดลอก token ทั้งก้อนให้ครบ",
      "กลับไปหน้า ตั้งค่าร้าน ของ JongMe แล้ววางในช่อง Channel Access Token",
    ],
    tip: "หากมี token เดิม ให้ใช้ตัวล่าสุดที่กด Issue",
  },
  {
    title: "เชื่อมต่อ JongMe — ขั้นที่ 7: ทดสอบจากหน้า JongMe",
    lines: [
      "กดบันทึกการตั้งค่า",
      "กดปุ่ม ทดสอบ (ควรขึ้นสำเร็จ)",
      "จากนั้นกด สร้าง/รีเฟรช Rich Menu",
      "เข้า LINE OA แล้วลองกดเมนูจองคิวเพื่อตรวจสอบอีกครั้ง",
    ],
    tip: "ผลลัพธ์ที่ควรเห็น: LINE แจ้งเตือนและเมนูใช้งานได้ตามปกติ",
  },
];

function Tip({ children }: { children: ReactNode }) {
  return (
    <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-2 text-[11px] leading-relaxed text-amber-950">
      <span className="font-semibold">💡 </span>
      {children}
    </p>
  );
}

function GuideImage({ file, stepLabel }: { file: string; stepLabel: string }) {
  const src = `${GUIDE_IMAGE_DIR}/${file}`;
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div className="rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-3 py-6 text-center">
        <p className="text-[11px] font-medium text-slate-600 mb-1">
          ยังไม่มีรูปสำหรับขั้นนี้
        </p>
        <p className="text-[10px] text-slate-500 font-mono break-all px-2">
          วางไฟล์{" "}
          <code className="bg-slate-200/80 px-1 rounded">{file}</code>
          <br />
          ใน{" "}
          <code className="bg-slate-200/80 px-1 rounded text-[9px]">
            public/images/line-oa-guide/
          </code>
        </p>
        <p className="text-[10px] text-slate-400 mt-2">
          รายชื่อไฟล์: <code className="text-[9px]">README.md</code> ในโฟลเดอร์เดียวกัน
        </p>
      </div>
    );
  }

  return (
    <div className="relative rounded-xl border border-slate-200 bg-slate-100 overflow-hidden">
      {!loaded && !failed && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-100 min-h-[120px]">
          <span className="text-[11px] text-slate-400">กำลังโหลดรูป…</span>
        </div>
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={stepLabel}
        className={`w-full h-auto object-contain max-h-[min(52vh,420px)] ${loaded ? "opacity-100" : "opacity-0"} transition-opacity`}
        loading="lazy"
        onLoad={() => setLoaded(true)}
        onError={() => setFailed(true)}
      />
      <p className="text-[10px] text-slate-500 px-2 py-1.5 border-t border-slate-200 bg-white/90">
        รูป: <span className="font-mono">{file}</span>
      </p>
    </div>
  );
}

function StepBlock({ step }: { step: GuideStep }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="px-3 py-2.5 border-b border-slate-100 bg-slate-50/80">
        <h3 className="text-[12px] font-semibold text-slate-900">{step.title}</h3>
        <ol className="mt-1.5 space-y-1 list-decimal list-inside text-[11px] text-slate-600 leading-relaxed">
          {step.lines.map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ol>
        {step.tip && <Tip>{step.tip}</Tip>}
      </div>
      {step.file ? (
        <div className="p-2 sm:p-3 bg-slate-50/50 border-t border-slate-100">
          <GuideImage file={step.file} stepLabel={step.title} />
        </div>
      ) : null}
    </section>
  );
}

export function LineGuide({ open, onClose, webhookUrl }: LineGuideProps) {
  const [copied, setCopied] = useState(false);
  const [track, setTrack] = useState<GuideTrack>("connect_only");

  useEffect(() => {
    if (open) setTrack("connect_only");
  }, [open]);

  if (typeof document === "undefined") return null;
  if (!open) return null;

  async function copyWebhook() {
    try {
      await navigator.clipboard.writeText(webhookUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  const content = (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 px-2 py-3 sm:px-4">
      <div
        className="w-full max-w-lg sm:max-w-xl md:max-w-2xl rounded-2xl bg-white shadow-2xl border border-slate-200 max-h-[95vh] flex flex-col"
        role="dialog"
        aria-labelledby="line-guide-title"
      >
        <div className="flex shrink-0 items-start justify-between gap-2 border-b border-slate-200 px-4 py-3">
          <div>
            <h2
              id="line-guide-title"
              className="text-sm font-bold text-slate-900 leading-snug"
            >
              📖 วิธีเชื่อมต่อ LINE OA กับ JongMe
            </h2>
            <p className="text-[10px] text-slate-500 mt-0.5">
              ส่วนเชื่อมต่อมีรูปประกอบที่{" "}
              <code className="text-[9px] bg-slate-100 px-1 rounded">public/images/line-oa-guide/</code>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-full w-8 h-8 flex items-center justify-center text-slate-500 hover:bg-slate-100 text-lg leading-none"
            aria-label="ปิด"
          >
            ×
          </button>
        </div>

        <div className="px-3 sm:px-4 pt-3 pb-4 overflow-y-auto space-y-4 text-xs text-slate-700">
          {/* แท็บ: เริ่มจาก 0 vs ข้ามไปเชื่อมต่อ */}
          <div
            className="flex rounded-xl border border-slate-200 bg-slate-100 p-1 gap-1"
            role="tablist"
            aria-label="โหมดคู่มือ"
          >
            <button
              type="button"
              role="tab"
              aria-selected={track === "from_zero"}
              onClick={() => setTrack("from_zero")}
              className={`flex-1 rounded-lg px-2 py-2 text-[10px] sm:text-[11px] font-semibold leading-snug transition-colors ${
                track === "from_zero"
                  ? "bg-white text-teal-800 shadow-sm ring-1 ring-slate-200"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              เริ่มจาก 0
              <span className="block font-normal text-[9px] opacity-90">
                ยังไม่มี OA
              </span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={track === "connect_only"}
              onClick={() => setTrack("connect_only")}
              className={`flex-1 rounded-lg px-2 py-2 text-[10px] sm:text-[11px] font-semibold leading-snug transition-colors ${
                track === "connect_only"
                  ? "bg-white text-teal-800 shadow-sm ring-1 ring-slate-200"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              มี OA แล้ว
              <span className="block font-normal text-[9px] opacity-90">
                ข้ามไปเชื่อมต่อ JongMe
              </span>
            </button>
          </div>

          {track === "from_zero" && (
            <>
              <p className="text-[11px] font-semibold text-slate-800 border-l-4 border-teal-500 pl-2">
                ส่วน ก — สร้าง LINE OA (ข้อความอย่างเดียว ไม่มีรูป — ทำครบก่อน แล้วค่อยไปส่วน ข)
              </p>
              {STEPS_CREATE_OA.map((step, i) => (
                <StepBlock key={`oa-${i}`} step={step} />
              ))}
              <div className="flex items-center gap-2 py-2">
                <div className="h-px flex-1 bg-slate-300" />
                <span className="text-[10px] font-semibold text-slate-500 whitespace-nowrap">
                  ต่อไป — เชื่อมต่อ JongMe
                </span>
                <div className="h-px flex-1 bg-slate-300" />
              </div>
            </>
          )}

          {track === "connect_only" && (
            <p className="text-[11px] text-slate-600">
              คุณมี LINE OA และ Channel ใน Developers แล้ว — ทำตาม{" "}
              <strong>ส่วน ข</strong> ด้านล่างได้เลย
            </p>
          )}

          {/* Webhook: โชว์ก่อนส่วน ขเสมอ (สำคัญตอนตั้ง Webhook ขั้น 5 ของส่วน ข) */}
          <div className="rounded-xl border-2 border-teal-300 bg-teal-50 p-3">
            <p className="font-semibold text-teal-900 text-[11px] mb-1.5">
              Webhook URL ของร้านนี้ (ใช้ในส่วน ข — ขั้นที่ 5)
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <code className="flex-1 break-all rounded-lg bg-white border border-teal-100 px-2 py-1.5 text-[10px] text-slate-800">
                {webhookUrl}
              </code>
              <button
                type="button"
                onClick={copyWebhook}
                className="shrink-0 rounded-lg bg-teal-600 px-3 py-1.5 text-[11px] font-medium text-white hover:bg-teal-700"
              >
                {copied ? "✅ คัดลอกแล้ว" : "📋 คัดลอก"}
              </button>
            </div>
          </div>

          <p className="text-[11px] font-semibold text-slate-800 border-l-4 border-slate-400 pl-2">
            ส่วน ข — เชื่อมต่อ JongMe กับ LINE (ทุกคนต้องทำ)
          </p>
          {STEPS_CONNECT.map((step, i) => (
            <StepBlock key={step.file ?? `connect-step-${i}`} step={step} />
          ))}

          <div className="rounded-xl border border-red-200 bg-red-50/70 p-3">
            <p className="font-semibold text-red-900 text-[11px] mb-1.5">
              Verify / ทดสอบ ไม่ผ่าน
            </p>
            <ul className="text-[10px] text-red-950/90 list-disc list-inside space-y-1 leading-relaxed">
              <li>Webhook URL ต้องตรงกับกล่องสีเขียวด้านบน</li>
              <li>เว็บ JongMe ต้องออนไลน์</li>
              <li>Channel secret กับ channel เดียวกับที่ตั้ง webhook</li>
              <li>ลองปิดแล้วเปิด Use webhook ใหม่</li>
            </ul>
          </div>

          <div className="flex flex-col sm:flex-row flex-wrap gap-2 pt-1">
            <button
              type="button"
              onClick={() =>
                window.open("https://manager.line.biz/", "_blank", "noopener,noreferrer")
              }
              className="inline-flex justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-[11px] font-medium text-slate-700 hover:bg-slate-50"
            >
              เปิด LINE OA Manager
            </button>
            <button
              type="button"
              onClick={() =>
                window.open("https://developers.line.biz/console/", "_blank", "noopener,noreferrer")
              }
              className="inline-flex justify-center rounded-xl bg-teal-600 px-4 py-2 text-[11px] font-semibold text-white hover:bg-teal-700"
            >
              เปิด LINE Developers
            </button>
            <button
              type="button"
              onClick={() =>
                window.open(
                  "https://developers.line.biz/en/docs/messaging-api/using-webhooks/",
                  "_blank",
                  "noopener,noreferrer"
                )
              }
              className="inline-flex justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-[11px] font-medium text-slate-700 hover:bg-slate-50"
            >
              คู่มือ Webhook (LINE)
            </button>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex justify-center rounded-xl border border-slate-200 px-4 py-2 text-[11px] font-medium text-slate-600 hover:bg-slate-50 sm:ml-auto"
            >
              ปิด
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
