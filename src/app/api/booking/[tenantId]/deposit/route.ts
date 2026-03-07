import { adminDb } from '@/lib/firebase/admin'
import { NextResponse } from 'next/server'
import admin from 'firebase-admin'

export async function POST(request: Request, { params }: { params: { tenantId: string } }) {
  console.log('[deposit] omise key prefix:', process.env.OMISE_SECRET_KEY?.substring(0, 15))
  try {
    const { tenantId } = params
    const body = await request.json()
    const { lineUserId, lineDisplayName, serviceId, staffId, date, time, depositAmount } = body

    if (!lineUserId || !serviceId || !date || !time || !depositAmount) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    const tenantDoc = await adminDb.collection('tenants').doc(tenantId).get()
    const tenant = tenantDoc.data()

    if (tenant?.depositMode === 'auto') {
      const chargeConfigDoc = await adminDb.collection('systemSettings').doc('chargeConfig').get()
      const chargePercent = chargeConfigDoc.exists ? (chargeConfigDoc.data()?.chargePercent || 4.65) : 4.65
      const chargeAmount = Math.round(depositAmount * (chargePercent / 100) * 100) / 100
      const totalAmount = depositAmount + chargeAmount

      const omise = require('omise')({ secretKey: process.env.OMISE_SECRET_KEY })

      const source = await omise.sources.create({
        type: 'promptpay',
        amount: Math.round(totalAmount * 100),
        currency: 'thb',
      })

      const charge = await omise.charges.create({
        amount: Math.round(totalAmount * 100),
        currency: 'thb',
        source: source.id,
        metadata: {
          tenantId,
          lineUserId,
          serviceId,
          staffId: staffId || 'any',
          date,
          time,
          depositAmount: String(depositAmount),
        },
      })

      await adminDb.collection('tenants').doc(tenantId).collection('pendingDeposits').doc(charge.id).set({
        lineUserId,
        lineDisplayName: lineDisplayName || '',
        serviceId,
        staffId: staffId || 'any',
        date,
        time,
        depositAmount,
        totalAmount,
        chargeId: charge.id,
        status: 'pending',
        mode: 'auto',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      })

      const serviceDoc = await adminDb.collection('services').doc(serviceId).get()
      const serviceData = serviceDoc.exists ? serviceDoc.data() : null
      let staffName = 'ไม่ระบุ'
      if (staffId && staffId !== 'any') {
        const staffDoc = await adminDb.collection('staff').doc(staffId).get()
        if (staffDoc.exists) staffName = staffDoc.data()?.name || staffName
      }
      const adminLineUserId = tenant?.adminLineUserId
      if (adminLineUserId && tenant?.lineChannelAccessToken) {
        const notifyText = `🔔 จองคิวใหม่!\n━━━━━━━━━━━━━━\n👤 ลูกค้า: ${lineDisplayName || ''}\n💇 บริการ: ${serviceData?.name || ''}\n📅 วันที่: ${date}\n⏰ เวลา: ${time} น.\n👤 ช่าง: ${staffName}\n💰 ราคา: ฿${serviceData?.price ?? 0}`
        try {
          await fetch('https://api.line.me/v2/bot/message/push', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer ' + tenant.lineChannelAccessToken
            },
            body: JSON.stringify({
              to: adminLineUserId,
              messages: [{ type: 'text', text: notifyText }]
            })
          })
        } catch (err) {
          console.error('Failed to notify admin:', err)
        }
      }

      const rawQrUrl = charge.source?.scannable_code?.image?.download_uri || ''
      let qrCodeUrl = ''
      if (rawQrUrl) {
        try {
          const sharp = require('sharp')
          const response = await fetch(rawQrUrl, {
            headers: { 'Authorization': 'Basic ' + Buffer.from(process.env.OMISE_SECRET_KEY + ':').toString('base64') }
          })
          const svgBuffer = Buffer.from(await response.arrayBuffer())
          const pngBuffer = await sharp(svgBuffer).png().resize(400, 400).toBuffer()
          const bucket = admin.storage().bucket('booking-platform-80979.firebasestorage.app')
          const fileName = `qr-codes/${Date.now()}.png`
          const file = bucket.file(fileName)
          await file.save(pngBuffer, { contentType: 'image/png', metadata: { cacheControl: 'public, max-age=300' } })
          await file.makePublic()
          qrCodeUrl = `https://storage.googleapis.com/booking-platform-80979.firebasestorage.app/${fileName}`
        } catch (err) {
          console.error('QR upload error:', err)
        }
      }

      return NextResponse.json({
        chargeId: charge.id,
        qrCodeUrl,
        totalAmount,
        chargePercent,
        chargeAmount,
        depositAmount,
      })
    }

    const pendingRef = adminDb.collection('tenants').doc(tenantId).collection('pendingDeposits').doc()
    await pendingRef.set({
      lineUserId,
      lineDisplayName: lineDisplayName || '',
      serviceId,
      staffId: staffId || 'any',
      date,
      time,
      depositAmount,
      status: 'waiting_transfer',
      mode: 'manual',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    })

    const serviceDoc = await adminDb.collection('services').doc(serviceId).get()
    const serviceData = serviceDoc.exists ? serviceDoc.data() : null
    let staffName = 'ไม่ระบุ'
    if (staffId && staffId !== 'any') {
      const staffDoc = await adminDb.collection('staff').doc(staffId).get()
      if (staffDoc.exists) staffName = staffDoc.data()?.name || staffName
    }
    const adminLineUserId = tenant?.adminLineUserId
    if (adminLineUserId && tenant?.lineChannelAccessToken) {
      const notifyText = `🔔 จองคิวใหม่!\n━━━━━━━━━━━━━━\n👤 ลูกค้า: ${lineDisplayName || ''}\n💇 บริการ: ${serviceData?.name || ''}\n📅 วันที่: ${date}\n⏰ เวลา: ${time} น.\n👤 ช่าง: ${staffName}\n💰 ราคา: ฿${serviceData?.price ?? 0}`
      try {
        await fetch('https://api.line.me/v2/bot/message/push', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + tenant.lineChannelAccessToken
          },
          body: JSON.stringify({
            to: adminLineUserId,
            messages: [{ type: 'text', text: notifyText }]
          })
        })
      } catch (err) {
        console.error('Failed to notify admin:', err)
      }
    }

    return NextResponse.json({
      pendingDepositId: pendingRef.id,
      depositAmount,
      mode: 'manual',
      bankName: tenant?.bankName || '',
      bankAccountNumber: tenant?.bankAccountNumber || '',
      bankAccountName: tenant?.bankAccountName || '',
      promptPayNumber: tenant?.promptPayNumber || '',
    })
  } catch (error) {
    console.error('Deposit API error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
