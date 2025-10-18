const cache: { [key: string]: { ts: number; data: any } } = {}

const TTL = 60 * 1000 // 60 seconds

export function getCachedMonthlyStats(key: string) {
  const entry = cache[key]
  if (!entry) return null
  if (Date.now() - entry.ts > TTL) {
    delete cache[key]
    return null
  }
  return entry.data
}

export function setCachedMonthlyStats(key: string, data: any) {
  cache[key] = { ts: Date.now(), data }
}

export function clearMonthlyStatsCache() {
  Object.keys(cache).forEach((k) => delete cache[k])
}

export default { getCachedMonthlyStats, setCachedMonthlyStats, clearMonthlyStatsCache }
