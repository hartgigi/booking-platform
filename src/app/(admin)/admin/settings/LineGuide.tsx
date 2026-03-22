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
    title: "ส่วน ก — ขั้นที่ 1 — เข้า LINE Official Account Manager",
    lines: [
      "เปิด https://manager.line.biz/ ในเบราว์เซอร์ (หรือใช้แอป LINE Official Account)",
      "ล็อกอินด้วยบัญชี LINE ที่จะเป็นเจ้าของ OA ร้าน",
      "ถ้ายังไม่เคยใช้ อาจต้องสร้างบัญชีผู้ดูแล / ยอมรับเงื่อนไขก่อน",
    ],
    tip: "ถ้าไม่เจอเมนู ให้ค้นหาคำว่า LINE Official Account Manager หรือ manager.line.biz",
  },
  {
    title: "ส่วน ก — ขั้นที่ 2 — สร้างบัญชี OA ใหม่",
    lines: [
      "กดสร้างบัญชีทางการ / Create / เพิ่มบัญชี (ชื่อปุ่มอาจต่างกัน)",
      "กรอกชื่อร้าน ประเภทธุรกิจ และข้อมูลที่หน้าจอขอให้ครบ",
      "ทำตามขั้นตอนจนสร้าง OA เสร็จ",
    ],
    tip: "ภาษาไทย/อังกฤษได้หมด ขอให้จบขั้นตอนจนขึ้นว่าสร้างสำเร็จ",
  },
  {
    title: "ส่วน ก — ขั้นที่ 3 — หลังสร้าง OA สำเร็จ",
    lines: [
      "คุณควรเห็นหน้าแดชบอร์ด / ตั้งค่าของ OA ร้าน",
      "ทดสอบให้ลูกค้า Add friend ได้ (ถ้ามี QR หรือลิงก์)",
      "จำชื่อ OA ไว้ — จะใช้หา channel ใน Developers ภายหลัง",
    ],
  },
  {
    title: "ส่วน ก — ขั้นที่ 4 — เข้า LINE Developers สร้าง Provider",
    lines: [
      "เปิด https://developers.line.biz/console/ แล้วล็อกอินด้วย LINE (แนะนำบัญชีเดียวกับแอดมิน OA)",
      "ถ้ายังไม่มี Provider ให้กดสร้าง Provider ใหม่ ตั้งชื่อทีมหรือร้าน",
      "เข้าไปใน Provider ที่สร้างแล้ว",
    ],
    tip: "ถ้า LINE ให้ “เชื่อม” หรือ “เพิ่ม” OA เข้า Provider ให้ทำตามหน้าจอ",
  },
  {
    title: "ส่วน ก — ขั้นที่ 5 — ให้มี Channel ของ OA ใน Console",
    lines: [
      "ใน Provider ควรเห็น Channel ที่เชื่อมกับ OA ร้านคุณ (มักมีคำว่า Messaging API หรือ Official Account)",
      "ถ้ายังไม่มีรายการ: ใช้ปุ่ม Add / Create / เชื่อม LINE Official Account ตามที่ LINE แสดง",
      "คลิกเข้า Channel นั้น — ต่อไปจะไปส่วน “เชื่อมต่อ JongMe” เหมือนแท็บ “มี OA แล้ว”",
    ],
    tip: "ถ้าติดขัดที่ขั้นนี้ ให้ดูคู่มือ LINE เรื่องเชื่อม OA กับ Developers หรือติดต่อ LINE",
  },
];

/** ส่วน ข — เชื่อมต่อ JongMe (มีรูปประกอบ 01 … 07) */
const STEPS_CONNECT: GuideStep[] = [
  {
    file: "01-console-home.png",
    title: "ส่วน ข — ขั้นที่ 1 — เข้า LINE Developers Console",
    lines: [
      "ชื่อไฟล์รูปที่ต้องใส่: 01-console-home.png",
      "เปิด developers.line.biz/console แล้วล็อกอินด้วย LINE",
      "เลือก Provider → เลือก Channel ของ OA ร้าน (มี Messaging API)",
    ],
    tip: "ถ้าไม่เห็น ให้ค้นหาคำว่า Console หรือ Provider",
  },
  {
    file: "02-channel-list.png",
    title: "ส่วน ข — ขั้นที่ 2 — ยืนยันว่าเลือก Channel ถูกตัว",
    lines: [
      "ชื่อไฟล์รูปที่ต้องใส่: 02-channel-list.png",
      "ในรายการ Channel ให้เลือกตัวที่ลูกค้าทักแชทร้านใน LINE",
      "ไม่ใช่ channel แบบ LINE Login ของแอปอื่น",
    ],
    tip: "ถ้ามีหลาย channel ให้เลือกตัวที่เป็น OA ร้านคุณ",
  },
  {
    file: "03-open-messaging-api-tab.png",
    title: "ส่วน ข — ขั้นที่ 3 — เปิดหน้า Channel",
    lines: [
      "ชื่อไฟล์รูปที่ต้องใส่: 03-open-messaging-api-tab.png",
      "หลังเข้า channel แล้ว ดูแท็บด้านบน: Basic settings, Messaging API, LIFF ฯลฯ",
      "ร้านค้าใช้แท็บ Messaging API + Basic settings เป็นหลัก",
    ],
  },
  {
    file: "04-basic-settings-secret.png",
    title: "ส่วน ข — ขั้นที่ 4 — คัดลอก Channel secret",
    lines: [
      "ชื่อไฟล์รูปที่ต้องใส่: 04-basic-settings-secret.png",
      "เปิดแท็บ Basic settings",
      "หา Channel secret → แสดงค่า → คัดลอก → วางในช่อง Channel Secret ใน JongMe",
    ],
    tip: "Secret กับ Channel ต้องเป็นคู่เดียวกัน",
  },
  {
    file: "05-messaging-api-webhook.png",
    title: "ส่วน ข — ขั้นที่ 5 — ตั้ง Webhook",
    lines: [
      "ชื่อไฟล์รูปที่ต้องใส่: 05-messaging-api-webhook.png",
      "เปิดแท็บ Messaging API",
      "เปิด Use webhook เป็น ON",
      "วาง Webhook URL จากกล่องสีเขียวด้านล่าง (กดคัดลอก)",
      "กด Update ถ้ามี แล้วกด Verify",
    ],
    tip: "URL ต้องตรงทุกตัวอักษรกับที่ JongMe แสดง",
  },
  {
    file: "06-messaging-api-token.png",
    title: "ส่วน ข — ขั้นที่ 6 — สร้าง Channel access token",
    lines: [
      "ชื่อไฟล์รูปที่ต้องใส่: 06-messaging-api-token.png",
      "ยังในแท็บ Messaging API",
      "หา Channel access token (long-lived) → กด Issue",
      "คัดลอก token ทั้งก้อน → วางในช่อง Channel Access Token ใน JongMe",
    ],
    tip: "ค้นคำว่า Issue หรือ long-lived บนหน้า",
  },
  {
    file: "07-jongme-settings-line.png",
    title: "ส่วน ข — ขั้นที่ 7 — ใน JongMe",
    lines: [
      "ชื่อไฟล์รูปที่ต้องใส่: 07-jongme-settings-line.png",
      "บันทึกการตั้งค่า (ถ้ามี)",
      "กด ทดสอบ — ควรผ่าน",
      "จากนั้นค่อยสร้าง Rich Menu ตามปุ่มในหน้าตั้งค่า",
    ],
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

          <div className="rounded-xl border border-amber-200 bg-amber-50/90 p-3 text-[11px] leading-relaxed text-amber-950">
            <p className="font-semibold mb-1">สำคัญ</p>
            <ul className="list-disc list-inside space-y-1">
              <li>ส่วนเชื่อมต่อ JongMe ใช้ Channel <strong>Messaging API ของ OA ร้าน</strong></li>
              <li>ไม่ใช่ Channel แบบ LINE Login ของระบบอื่น</li>
            </ul>
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
          {STEPS_CONNECT.map((step) => (
            <StepBlock key={step.file} step={step} />
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
