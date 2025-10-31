"use client"
import { useEffect, useState } from 'react'

export default function Preloader() {
  const [visible, setVisible] = useState(true)
  const [percent, setPercent] = useState(0)

  useEffect(() => {
    let mounted = true
    const parts = { fonts: 25, css: 25, image: 40, dom: 10 }
    const done: Record<string, boolean> = { fonts: false, css: false, image: false, dom: false }

    function compute() {
      let sum = 0
      type K = keyof typeof parts
      for (const k0 in parts) {
        const k = k0 as K
        if (done[k]) sum += parts[k]
      }
      return sum
    }

    function refreshVisual() {
      const resourceVal = compute()
      // auto-progress baseline
      const auto = Math.min(90, Math.max(5, resourceVal || (percent || 5)))
      const visual = Math.max(resourceVal, Math.round(auto))
      if (!mounted) return
      setPercent(visual)
      if (visual >= 100) finalize()
    }

  function setDone(k: keyof typeof done) { if (!done[k]) { done[k] = true; refreshVisual(); } }

    // fonts
    if ((document as any).fonts && (document as any).fonts.ready) {
      ;(document as any).fonts.ready.then(() => setDone('fonts')).catch(() => setDone('fonts'))
    } else setDone('fonts')

    // css
    try {
      const cssLink = document.querySelector('link[rel="preload"][as="style"], link[rel="stylesheet"]') as HTMLLinkElement | null
      if (cssLink) {
        if (cssLink.sheet || cssLink.rel === 'stylesheet') setDone('css')
        else {
          cssLink.addEventListener('load', () => setDone('css'), { once: true })
          cssLink.addEventListener('error', () => setDone('css'), { once: true })
        }
      } else setDone('css')
    } catch (e) { setDone('css') }

    // image
    try {
      const imgLink = document.querySelector('link[rel="preload"][as="image"]') as HTMLLinkElement | null
      if (imgLink && imgLink.href) {
        const img = new Image()
        img.onload = () => setDone('image')
        img.onerror = () => setDone('image')
        img.src = imgLink.href
      } else setDone('image')
    } catch (e) { setDone('image') }

    // dom
    if (document.readyState === 'complete' || document.readyState === 'interactive') setDone('dom')
    else document.addEventListener('DOMContentLoaded', () => setDone('dom'), { once: true })

    // watch for an app readiness flag
    const onAppReady = () => { for (const k in done) done[k] = true; refreshVisual() }
    ;(window as any).__APP_READY__ && onAppReady()
    window.addEventListener('app-ready', onAppReady)

    // auto step interval (only for visual motion)
    const iv = setInterval(() => {
      const current = compute()
      if (current >= 90) return
      const bump = Math.floor(Math.random()*6)+1
      const next = Math.min(90, Math.max(current, (percent || 5) + bump))
      if (mounted) setPercent(next)
    }, 300)

    // fallback timeout
    const to = setTimeout(() => { for (const k in done) done[k] = true; refreshVisual() }, 15000)

    function finalize() {
      if (!mounted) return
      setPercent(100)
      setTimeout(() => { if (mounted) setVisible(false) }, 300)
    }

    return () => {
      mounted = false
      clearInterval(iv); clearTimeout(to)
      window.removeEventListener('app-ready', onAppReady)
    }
  }, [])

  if (!visible) return null

  return (
    <div style={{position:'fixed',inset:0,display:'flex',alignItems:'center',justifyContent:'center',background:'#333333',zIndex:99999}} aria-hidden={false}>
      <div style={{width:'min(640px,84vw)',padding:18,borderRadius:12,background:'rgba(255,255,255,0.03)',boxShadow:'0 6px 18px rgba(0,0,0,0.45)',display:'flex',flexDirection:'column',gap:12}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div style={{color:'#fff',fontWeight:700,fontSize:14}}>Loading</div>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <div style={{flex:1,height:12,background:'rgba(255,255,255,0.08)',borderRadius:999,overflow:'hidden'}}>
            <div style={{height:'100%',width:percent+'%',background:'linear-gradient(90deg,#4ade80,#06b6d4)',borderRadius:999,transition:'width 180ms linear'}} />
          </div>
          <div style={{minWidth:50,textAlign:'right',color:'#fff',fontSize:13,fontWeight:600}}>{percent}%</div>
        </div>
      </div>
    </div>
  )
}
