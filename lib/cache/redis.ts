import Redis from 'ioredis'

let client: Redis | null = null

export function getRedisClient() {
  if (client) return client

  const url = process.env.REDIS_URL
  if (!url) {
    console.warn('[v0] REDIS_URL not set; Redis cache disabled')
    return null
  }

  client = new Redis(url)
  client.on('error', (err) => console.error('[v0] Redis error', err))
  return client
}

export default getRedisClient
