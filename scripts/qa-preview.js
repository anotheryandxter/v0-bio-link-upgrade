const fs = require('fs')
const puppeteer = require('puppeteer')
;(async () => {
  try {
    const previewPath = '/tmp/vercel_preview_url_chart_fix.txt'
    if (!fs.existsSync(previewPath)) throw new Error('Preview URL file not found: ' + previewPath)
    const url = fs.readFileSync(previewPath, 'utf8').trim()
    if (!url) throw new Error('Preview URL empty')
    console.log('Preview URL:', url)

    const browser = await puppeteer.launch({ args: ['--no-sandbox','--disable-setuid-sandbox'] })
    const page = await browser.newPage()
    page.setViewport({ width: 1280, height: 900 })
    const target = url.replace(/\/$/, '') + '/dashboard/analytics'
    console.log('Navigating to', target)
    await page.goto(target, { waitUntil: 'networkidle2', timeout: 60000 })

    // Try to open the Link dropdown and select first non-empty option
    const debugInfo = await page.evaluate(() => {
      const labels = Array.from(document.querySelectorAll('label')).map(l => l.textContent && l.textContent.trim())
      const selects = document.querySelectorAll('select')
      return { labels, selects: selects.length }
    })
    console.log('Labels on page:', debugInfo.labels)
    console.log('Select count:', debugInfo.selects)

    const selected = await page.evaluate(() => {
      const labels = Array.from(document.querySelectorAll('label'))
      let lab = labels.find(l => l.textContent && l.textContent.trim().toLowerCase() === 'link')
      // Fallback: find any label that contains 'link' (case-insensitive)
      if (!lab) lab = labels.find(l => l.textContent && /link/i.test(l.textContent))
      if (lab) {
        const sel = lab.parentElement.querySelector('select')
        if (sel) {
          const opt = sel.querySelector('option:not([value=""])')
          if (opt) {
            sel.value = opt.value
            sel.dispatchEvent(new Event('change', { bubbles: true }))
            return 'selected-by-label'
          }
          return 'no-option'
        }
        return 'no-select'
      }
      // Final fallback: choose the first select on the page (if any)
      const all = document.querySelectorAll('select')
      if (all.length > 0) {
        const sel = all[0]
        const opt = sel.querySelector('option:not([value=""])')
        if (opt) { sel.value = opt.value; sel.dispatchEvent(new Event('change', { bubbles: true })); return 'selected-first' }
        return 'no-option-first'
      }
      return 'no-label'
    })
    console.log('Select result:', selected)

    // Wait for expected SVG path (line stroke color) to appear
    try {
      await page.waitForSelector('svg path[stroke="#4f46e5"]', { timeout: 10000 })
      console.log('Line SVG path found')
    } catch (e) {
      console.log('Line SVG path not found within timeout')
    }

    // Wait a bit for chart animation/update
    await new Promise((res) => setTimeout(res, 1200))

    const out = 'tmp/qa_preview.png'
    await page.screenshot({ path: out, fullPage: true })
    console.log('Saved screenshot to', out)
    await browser.close()
  } catch (err) {
    console.error('QA script error:', err)
    process.exit(2)
  }
})()
