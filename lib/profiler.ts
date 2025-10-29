export async function timeAsync<T>(label: string, fn: () => Promise<T>) {
  const start = Date.now()
  try {
    const result = await fn()
    const ms = Date.now() - start
    console.log(`[v0][perf] ${label} took ${ms}ms`)
    return result
  } catch (err) {
    const ms = Date.now() - start
    console.error(`[v0][perf] ${label} failed after ${ms}ms`, err)
    throw err
  }
}

export default { timeAsync }
