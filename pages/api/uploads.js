// Node.js runtime uploads handler (Next.js pages API)
const formidable = require('formidable')
const fs = require('fs')
let sharp = null
try {
  sharp = require('sharp')
} catch (e) {
  console.warn('sharp not available; upload handler will skip image transforms')
}
const { createClient } = require('@supabase/supabase-js')
// Cloudinary support (preferred server-side processing when configured)
let cloudinary = null
const cloudName = process.env.CLOUDINARY_CLOUD_NAME
const cloudApiKey = process.env.CLOUDINARY_API_KEY
const cloudApiSecret = process.env.CLOUDINARY_API_SECRET
if (cloudName && cloudApiKey && cloudApiSecret) {
  try {
    cloudinary = require('cloudinary').v2
    cloudinary.config({
      cloud_name: cloudName,
      api_key: cloudApiKey,
      api_secret: cloudApiSecret,
    })
  } catch (err) {
    console.warn('cloudinary package not available or failed to init', err.message)
    cloudinary = null
  }
}

module.exports = async (req, res) => {
  // Allow CORS preflight and log method/content-type for debugging
  console.log('uploads handler invoked', { method: req.method, headers: req.headers && { 'content-type': req.headers['content-type'] || req.headers['Content-Type'] } })
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    return res.status(204).end()
  }
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

      const bucket = (fields.bucket && String(fields.bucket)) || 'public'
      const baseName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '')}`

      // If Cloudinary is configured, prefer uploading there and returning transform URLs
      if (cloudinary) {
        try {
          const sizes = [320, 640, 1200]
          const uploadResult = await cloudinary.uploader.upload(inputPath, { folder: 'v0_uploads' })
          const publicId = uploadResult.public_id
          const uploaded = sizes.map((w) => ({
            width: w,
            url: cloudinary.url(publicId, { transformation: [{ width: w, crop: 'limit' }], format: 'webp', secure: true }),
          }))
          const jpegUrl = cloudinary.url(publicId, { transformation: [{ width: 1200, crop: 'limit' }], format: 'jpg', secure: true })
          return res.json({ uploaded, jpeg: jpegUrl, cloudinary: uploadResult.secure_url })
        } catch (e) {
          console.error('cloudinary upload error', e)
          // fall through to sharp/supabase fallback
        }
      }

      if (sharp) {
        // generate variants
        const sizes = [320, 640, 1200]
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
      } else {
        // fallback: upload original file buffer and return URL
        const ext = (file.mimetype && file.mimetype.split('/')[1]) || 'bin'
        const origPath = `${baseName}-original.${ext}`
        const { error: upErr } = await supabase.storage.from(bucket).upload(origPath, buffer, { cacheControl: 'public, max-age=31536000' })
        if (upErr) return res.status(500).json({ error: upErr.message })
        const { data: pub } = supabase.storage.from(bucket).getPublicUrl(origPath)
        res.json({ uploaded: [], jpeg: pub.publicUrl, note: 'sharp not available: original stored only' })
      }
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

if (!module.exports.default) module.exports.default = module.exports
