// Simple test endpoint to verify POST handling in production
module.exports = (req, res) => {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    return res.status(204).end()
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' })

  const chunks = []
  req.on('data', (c) => chunks.push(c))
  req.on('end', () => {
    const body = Buffer.concat(chunks).toString('base64').slice(0, 200)
    res.json({ ok: true, method: req.method, headers: req.headers, bodyBase64Prefix: body })
  })
}

if (!module.exports.default) module.exports.default = module.exports
