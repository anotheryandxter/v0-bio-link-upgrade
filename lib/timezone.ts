// Helpers to format and compute dates in GMT+7 (Asia/Jakarta)
const TZ = 'Asia/Jakarta'
const TZ_OFFSET_HOURS = 7
const TZ_OFFSET_MS = TZ_OFFSET_HOURS * 60 * 60 * 1000

export function formatMonthShort(date: string | Date) {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('en-US', { timeZone: TZ, year: 'numeric', month: 'short' }).format(d)
}

export function formatMonthDay(date: string | Date) {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('en-US', { timeZone: TZ, month: 'short', day: 'numeric' }).format(d)
}

export function formatDateTime(date: string | Date) {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('en-US', {
    timeZone: TZ,
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  }).format(d)
}

// Return an ISO timestamp (UTC) that corresponds to the start of the day
// in the target timezone (GMT+7) for `daysAgo` days before today.
export function startOfDayIsoTZ(daysAgo = 0) {
  // Get current instant shifted to target timezone
  const nowShifted = new Date(Date.now() + TZ_OFFSET_MS - daysAgo * 24 * 60 * 60 * 1000)
  const year = nowShifted.getUTCFullYear()
  const month = nowShifted.getUTCMonth()
  const day = nowShifted.getUTCDate()

  // The UTC instant that corresponds to midnight at target TZ is
  // Date.UTC(year, month, day) - TZ_OFFSET_MS
  const startUtcMs = Date.UTC(year, month, day) - TZ_OFFSET_MS
  return new Date(startUtcMs).toISOString()
}

export default { formatMonthShort, formatMonthDay, formatDateTime, startOfDayIsoTZ }
