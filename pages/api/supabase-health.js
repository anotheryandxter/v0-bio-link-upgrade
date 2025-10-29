// Simple server-side health check for Supabase storage and envs
const { createAdminSupabaseClient } = require('../../lib/supabase/admin')

module.exports = async (req, res) => {
  if (req.method !== 'GET') return res.status(405).end('Method Not Allowed')

  try {
    // Construct admin client (will throw if envs missing)
    const supabase = createAdminSupabaseClient()

    // Check that the `public` bucket exists by attempting a short list
    const bucketName = req.query.bucket || 'public'
    let listResult
    try {
      listResult = await supabase.storage.from(bucketName).list('', { limit: 1 })
    } catch (e) {
      // older/newer SDKs may throw; catch and surface
      return res.status(500).json({ ok: false, error: 'storage.list threw', message: e.message })
    }

    if (listResult && listResult.error) {
      return res.status(500).json({ ok: false, error: listResult.error.message || listResult.error })
    }

    return res.json({ ok: true, bucket: bucketName, sample: listResult.data || [] })
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message })
  }
}

module.exports.config = { api: { bodyParser: true } }
