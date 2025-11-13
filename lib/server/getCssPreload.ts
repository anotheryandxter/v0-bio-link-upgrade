import fs from 'fs'
import path from 'path'

/**
 * Server-side helper to find the generated CSS bundle under .next/static/css
 * and return a client-visible href like '/_next/static/css/<file>.css'.
 *
 * This runs at build/runtime on the server and is safe to call from
 * server components (like `app/layout.tsx`). If no file is found, it
 * returns null so callers can fallback to a sensible default.
 */
export function getCssPreloadHref(): string | null {
  try {
    const base = path.resolve(process.cwd(), '.next', 'static', 'css')
    if (!fs.existsSync(base)) return null
    const files = fs.readdirSync(base).filter((f) => f.endsWith('.css'))
    if (!files.length) return null
    // Prefer the first (there will usually be one main css bundle)
    const file = files[0]
    return `/_next/static/css/${file}`
  } catch (err) {
    // If something goes wrong (permission, missing dir), gracefully fallback
    return null
  }
}

export default getCssPreloadHref
