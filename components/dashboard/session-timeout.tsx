"use client"

import { useEffect, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

// Idle timeout in milliseconds (5 minutes)
const IDLE_TIMEOUT = 5 * 60 * 1000
const LAST_ACTIVITY_KEY = "admin:lastActivity"

export default function SessionTimeout() {
  const supabase = createClient()
  const router = useRouter()
  const timerRef = useRef<number | null>(null)

  useEffect(() => {
    // helper to update last activity timestamp (shared across tabs)
    const touch = () => {
      try {
        const now = Date.now()
        localStorage.setItem(LAST_ACTIVITY_KEY, String(now))
      } catch (e) {
        // ignore
      }
      resetTimer()
    }

    const resetTimer = () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current)
      }
      timerRef.current = window.setTimeout(async () => {
        // idle timeout reached -> sign out and redirect to login
        try {
          await supabase.auth.signOut()
        } catch (e) {
          // ignore
        }
        // clear lastActivity so other tabs don't immediately re-trigger
        try {
          localStorage.removeItem(LAST_ACTIVITY_KEY)
        } catch (e) {
          // ignore
        }
        router.push("/login")
      }, IDLE_TIMEOUT)
    }

    // Activity events to listen to
    const events = ["mousemove", "mousedown", "keydown", "touchstart", "click", "scroll"]
    events.forEach((ev) => window.addEventListener(ev, touch, { passive: true }))

    // Listen to storage events to sync activity across tabs
    const onStorage = (e: StorageEvent) => {
      if (e.key === LAST_ACTIVITY_KEY && e.newValue) {
        // another tab had activity, reset our timer
        resetTimer()
      }
    }
    window.addEventListener("storage", onStorage)

    // initialize
    touch()

    return () => {
      events.forEach((ev) => window.removeEventListener(ev, touch as any))
      window.removeEventListener("storage", onStorage)
      if (timerRef.current) window.clearTimeout(timerRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return null
}
