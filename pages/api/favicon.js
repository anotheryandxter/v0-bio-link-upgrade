// Serve public/favicon.png if present, otherwise return a tiny transparent placeholder.
// This lets you drop a real favicon into /public/favicon.png (preferred) and
// still have a safe fallback for dev or before you add the file.
const fs = require('fs')
const path = require('path')

module.exports = (req, res) => {
  try {
    // Prefer to serve a multi-resolution ICO when available (legacy browsers)
    const icoPath = path.join(process.cwd(), 'public', 'favicon.ico')
    if (fs.existsSync(icoPath)) {
      const data = fs.readFileSync(icoPath)
      res.setHeader('Content-Type', 'image/x-icon')
      res.setHeader('Cache-Control', 'public, max-age=86400')
      return res.end(data)
    }

    const publicPng = path.join(process.cwd(), 'public', 'favicon.png')
    if (fs.existsSync(publicPng)) {
      const data = fs.readFileSync(publicPng)
      res.setHeader('Content-Type', 'image/png')
      res.setHeader('Cache-Control', 'public, max-age=86400')
      return res.end(data)
    }
  } catch (err) {
    console.warn('favicon route: failed to read static favicon', err)
  }

  res.statusCode = 404
  res.end('favicon not found')
}
