"use client"
import { useEffect } from 'react'

export default function PreloaderReady() {
  useEffect(() => {
    try {
      // signal the preloader that the app has hydrated and is ready
      // this will cause the preloader to complete and remove itself
      // as the script in app/layout.tsx watches window.__APP_READY__
      (window as any).__APP_READY__ = true
    } catch (e) {
      // noop
    }
  }, [])

  return null
}
