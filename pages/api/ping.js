module.exports = (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method Not Allowed' })
  res.json({ ok: true, ts: new Date().toISOString() })
}
