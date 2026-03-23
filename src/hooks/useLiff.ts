'use client'
import { useState, useEffect } from 'react'
import liff from '@line/liff'

interface LiffProfile {
  userId: string
  displayName: string
  pictureUrl?: string
}

export function useLiff() {
  const [profile, setProfile] = useState<LiffProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const initLiff = async () => {
      try {
        await liff.init({
          liffId: process.env.NEXT_PUBLIC_LIFF_ID || '',
          withLoginOnExternalBrowser: false,
        })
        if (liff.isLoggedIn()) {
          const p = await liff.getProfile()
          setProfile({ userId: p.userId, displayName: p.displayName, pictureUrl: p.pictureUrl })
        } else {
          setProfile(null)
        }
      } catch (err: any) {
        console.error('LIFF init error:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    initLiff()
  }, [])

  return { profile, loading, error, liff }
}
