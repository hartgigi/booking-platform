# Deploy ผ่าน Vercel

## ขั้นตอนที่ 1: เตรียมโปรเจกต์

- โปรเจกต์ต้องอยู่ใน Git (GitHub / GitLab / Bitbucket) ถ้ายังไม่ได้ push ไป remote ให้ทำก่อน
- มีบัญชี [Vercel](https://vercel.com) (สมัครฟรี)

---

## ขั้นตอนที่ 2: สร้างโปรเจกต์บน Vercel (ผูก Git)

1. ไปที่ **https://vercel.com** → ล็อกอิน
2. กด **Add New…** → **Project**
3. เลือก **Import Git Repository** → เลือก repo ของ booking-platform (หรือกด **Import** จาก GitHub)
4. ตั้งค่า:
   - **Framework Preset:** Next.js (Vercel ตรวจจับอัตโนมัติ)
   - **Root Directory:** เว้นว่าง
   - **Build Command:** `npm run build`
   - **Output Directory:** เว้นว่าง (ใช้ค่า default ของ Next.js)
5. **ยังไม่ต้องกด Deploy** — ไปขั้นตอนที่ 3 ก่อน

---

## ขั้นตอนที่ 3: ใส่ Environment Variables

ในหน้าเดียวกัน (ก่อน Deploy) เลือก **Environment Variables** แล้วเพิ่มตัวแปรด้านล่าง  
ค่าให้ copy จากไฟล์ `.env.local` ในเครื่องคุณ (หรือจาก Firebase Console / Service Account)

### ตัวแปรที่ต้องมี (สำหรับ Production)

| Name | ใช้ที่ | ตัวอย่าง / หมายเหตุ |
|------|--------|----------------------|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase Client | จาก Firebase Console → Project Settings → General |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase Client | `booking-platform-80979.firebaseapp.com` |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Firebase Client | `booking-platform-80979` |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Firebase Client | `booking-platform-80979.appspot.com` |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Firebase Client | ตัวเลขจาก Console |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Firebase Client | จาก Console |
| `FIREBASE_ADMIN_PROJECT_ID` | Firebase Admin (API) | `booking-platform-80979` |
| `FIREBASE_ADMIN_CLIENT_EMAIL` | Firebase Admin | จาก Service Account JSON |
| `FIREBASE_ADMIN_PRIVATE_KEY` | Firebase Admin | จาก Service Account (รวม `\n` ใน value ได้) |
| `FIREBASE_STORAGE_BUCKET` | Firebase Admin | `booking-platform-80979.appspot.com` |
| `CRON_SECRET` | API cron reminders | สร้างรหัสลับเอง (ถ้าใช้ cron) |
| `NEXT_PUBLIC_LIFF_ID` | หน้า booking ลูกค้า (LIFF) | ถ้ามี LIFF (ไม่บังคับตอนทดสอบ) |
| `OMISE_SECRET_KEY` | ชำระแพ็กเกจ (PromptPay QR), มัดจำ | **Live:** `skey_live_...` จาก [Omise Dashboard](https://dashboard.omise.co) — ดูขั้นตอนเต็มใน [`docs/OMISE_PRODUCTION.md`](./docs/OMISE_PRODUCTION.md) |

**ถ้าใช้ Service Account แบบ JSON ทั้งก้อน:**

- ใช้ตัวแปรเดียวชื่อ `FIREBASE_SERVICE_ACCOUNT_JSON`  
- value = เนื้อหา JSON ทั้งหมดของไฟล์ service account (ใส่ใน Vercel เป็นแบบ Sensitive)

ใส่ครบแล้วกด **Deploy** ได้เลย

---

## ขั้นตอนที่ 4: หลัง Deploy เสร็จ

- Vercel จะให้ URL เช่น `booking-platform-xxx.vercel.app`
- ลองเปิด URL นั้น → หน้าแรก / ล็อกอินแอดมิน / Dashboard ควรใช้ได้

---

## ขั้นตอนที่ 5: ผูกโดเมน www.jongme.com (ทำทีหลังได้)

1. ใน Vercel → โปรเจกต์ → **Settings** → **Domains**
2. กด **Add** → พิมพ์ `www.jongme.com` → Save
3. ไปที่ผู้ให้บริการโดเมน (ที่ซื้อ jongme.com) → จัดการ DNS
4. เพิ่ม CNAME:
   - **Name/Host:** `www`
   - **Value/Points to:** `cname.vercel-dns.com` (หรือค่าที่ Vercel แสดง)
5. รอ DNS propagate (ประมาณ 5–30 นาที) แล้วเปิด https://www.jongme.com

---

## Deploy ครั้งถัดไป (อัปเดตโค้ด)

- ถ้าเชื่อม Git ไว้: แค่ **push ขึ้น GitHub** Vercel จะ build และ deploy ให้อัตโนมัติ
- หรือรันในเครื่อง: `npm run deploy` (ต้องติดตั้ง Vercel CLI และ `vercel link` ไว้ก่อน)
