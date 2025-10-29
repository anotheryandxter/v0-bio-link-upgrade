/*
  Test upload script: uploads a generated PNG to Supabase Storage 'public' bucket
  Usage: node scripts/test_upload.js
  Requires env vars: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
*/

const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    console.error('Missing env vars NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    process.exit(2)
  }

  const supabase = createClient(url, serviceKey)
  const bucket = process.env.TEST_BUCKET || 'public'

  // Create a small sample PNG if not present
  const samplePath = path.join(__dirname, 'sample.png')
  if (!fs.existsSync(samplePath)) {
    // a 1x1 transparent PNG
    const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8HwQACfsD/Q0zfgAAAABJRU5ErkJggg=='
    fs.writeFileSync(samplePath, Buffer.from(pngBase64, 'base64'))
    console.log('Wrote sample.png')
  }

  const file = fs.createReadStream(samplePath)
  const filename = `${Date.now()}-sample.png`
  const destPath = filename

  console.log('Uploading to', bucket, 'path', destPath)
  const { data, error } = await supabase.storage.from(bucket).upload(destPath, file, { cacheControl: 'public, max-age=31536000', upsert: false })
  if (error) {
    console.error('Upload error:', error)
    process.exit(3)
  }

  const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(destPath)
  console.log('Uploaded. publicUrl=', publicData?.publicUrl)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
