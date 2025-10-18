// Node.js runtime uploads handler (Next.js pages API)
const formidable = require('formidable')
const fs = require('fs')
const sharp = require('sharp')
const { createClient } = require('@supabase/supabase-js')

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end('Method Not Allowed')

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseService = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !supabaseService) return res.status(500).json({ error: 'Supabase env not configured' })

  const supabase = createClient(supabaseUrl, supabaseService)
  const form = new formidable.IncomingForm()
  form.parse(req, async (err, fields, files) => {
    if (err) return res.status(400).json({ error: err.message })
    const file = files.file
    if (!file) return res.status(400).json({ error: 'No file' })

    try {
      const inputPath = file.path || file.filepath || file.file
      const buffer = fs.readFileSync(inputPath)

      // generate variants
      const sizes = [320, 640, 1200]
      const bucket = (fields.bucket && String(fields.bucket)) || 'public'
      const baseName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '')}`
      const uploaded = []

      for (const w of sizes) {
        const out = await sharp(buffer).resize({ width: w }).webp({ quality: 80 }).toBuffer()
        const pathName = `${baseName}-${w}.webp`
        const { error: upErr } = await supabase.storage.from(bucket).upload(pathName, out, { cacheControl: 'public, max-age=31536000' })
        if (upErr) return res.status(500).json({ error: upErr.message })
        const { data: pub } = supabase.storage.from(bucket).getPublicUrl(pathName)
        uploaded.push({ width: w, url: pub.publicUrl })
      }

      // Also upload an original-optimized JPEG (max 1200)
      const jpegBuf = await sharp(buffer).resize({ width: 1200 }).jpeg({ quality: 85 }).toBuffer()
      const jpegPath = `${baseName}-1200.jpg`
      const { error: jpegErr } = await supabase.storage.from(bucket).upload(jpegPath, jpegBuf, { cacheControl: 'public, max-age=31536000' })
      if (jpegErr) return res.status(500).json({ error: jpegErr.message })
      const { data: jpegPub } = supabase.storage.from(bucket).getPublicUrl(jpegPath)

      res.json({ uploaded, jpeg: jpegPub.publicUrl })
    } catch (e) {
      console.error(e)
      res.status(500).json({ error: e.message })
    }
  })
}

// disable body parsing by Next for formidable
module.exports.config = {
  api: {
    bodyParser: false,
  },
}
