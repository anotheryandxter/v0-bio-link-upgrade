module.exports = (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method Not Allowed' })
  res.json({ ok: true, ts: new Date().toISOString() })
}

// Ensure compatibility with Next's ESM loader which expects a default export
if (!module.exports.default) module.exports.default = module.exports
