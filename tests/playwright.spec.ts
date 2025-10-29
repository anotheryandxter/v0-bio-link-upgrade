import { test } from '@playwright/test'
import fs from 'fs'
import path from 'path'

const viewports = [
  { name: 'mobile', width: 375, height: 812 },
  { name: 'tablet', width: 820, height: 1180 },
  { name: 'desktop', width: 1280, height: 900 },
]

const OUT = path.resolve(process.cwd(), 'tmp/playwright-snapshots')
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true })

test('parallax backgrounds across viewports', async ({ page }) => {
  for (const vp of viewports) {
    await page.setViewportSize({ width: vp.width, height: vp.height })
    await page.goto('http://localhost:3000/')
    // give the page a moment to load and parallax to initialize
    await page.waitForTimeout(600)
    // scroll a few positions and take screenshots
    await page.screenshot({ path: path.join(OUT, `${vp.name}-top.png`), fullPage: false })
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight / 2))
    await page.waitForTimeout(300)
    await page.screenshot({ path: path.join(OUT, `${vp.name}-mid.png`), fullPage: false })
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
    await page.waitForTimeout(300)
    await page.screenshot({ path: path.join(OUT, `${vp.name}-bottom.png`), fullPage: false })
  }
})
