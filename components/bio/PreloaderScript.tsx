'use client'

import { useEffect } from 'react'

export function PreloaderScript() {
  useEffect(() => {
    try {
      const el = document.getElementById('server-preloader');
      const bar = document.getElementById('server-preloader-bar');
      const pct = document.getElementById('server-preloader-percent');
      if (!el || !bar || !pct) return;
      let value = 3;
      bar.style.width = value + '%';
      pct.textContent = Math.round(value) + '%';
      const iv = setInterval(() => {
        value = Math.min(90, value + Math.random() * 6 + 1);
        bar.style.width = Math.round(value) + '%';
        pct.textContent = Math.round(value) + '%';
        if (value >= 90) clearInterval(iv);
      }, 300);
      const finish = () => {
        clearInterval(iv);
        bar.style.width = '100%';
        pct.textContent = '100%';
        el.classList.add('hidden');
        setTimeout(() => { try { el.remove(); } catch (e) {} }, 320);
      };
      if ((window as any).__APP_READY__) { finish(); return; }
      window.addEventListener('app-ready', finish, { once: true });
      document.addEventListener('DOMContentLoaded', finish, { once: true });
      window.addEventListener('load', finish, { once: true });
      setTimeout(finish, 15000);
    } catch (e) { /* noop */ }
  }, []);

  return null;
}
