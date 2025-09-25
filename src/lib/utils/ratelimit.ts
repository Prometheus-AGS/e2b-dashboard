import { kv } from '@/lib/clients/kv'
import { Ratelimit } from '@upstash/ratelimit'
import { Duration } from './duration'

export interface RateLimitResult {
  success: boolean
  limit: number
  reset: number
  remaining: number
}

/**
 * Apply rate limiting to a key using @upstash/ratelimit
 * @param key - Unique identifier for the rate limit (e.g., user ID, IP address)
 * @param maxRequests - Maximum number of requests allowed in the window
 * @param window - Time window for the rate limit (e.g., '1h', '24h', '1d')
 * @returns RateLimitResult with success status and rate limit metadata
 */
export async function applyRateLimit(
  key: string,
  maxRequests: number,
  window: Duration
): Promise<RateLimitResult | null> {
  // only apply rate limiting if kv is configured
  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    const ratelimit = new Ratelimit({
      redis: kv,
      limiter: Ratelimit.slidingWindow(maxRequests, window),
    })

    const result = await ratelimit.limit(key)

    return {
      success: result.success,
      limit: result.limit,
      reset: result.reset,
      remaining: result.remaining,
    }
  }

  // if rate limiting is not configured, allow all requests
  return null
}

/**
 * Check rate limit status without incrementing the counter
 * @param key - Unique identifier for the rate limit (e.g., user ID, IP address)
 * @param maxRequests - Maximum number of requests allowed in the window
 * @param window - Time window for the rate limit (e.g., '1h', '24h', '1d')
 * @returns RateLimitResult with current status, or null if rate limiting disabled
 */
export async function checkRateLimit(
  key: string,
  maxRequests: number,
  window: Duration
): Promise<RateLimitResult | null> {
  // only apply rate limiting if kv is configured
  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    const ratelimit = new Ratelimit({
      redis: kv,
      limiter: Ratelimit.slidingWindow(maxRequests, window),
    })

    // getRemaining() to check without incrementing
    const result = await ratelimit.getRemaining(key)

    return {
      success: result.remaining > 0,
      limit: maxRequests,
      reset: result.reset,
      remaining: result.remaining,
    }
  }

  // if rate limiting is not configured, allow all requests
  return null
}
