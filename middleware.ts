import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { redis } from './lib/redis'

// Rate limit configuration
const RATE_LIMIT_MAX = 60
 // Maximum number of requests allowed
const RATE_LIMIT_WINDOW = 60 // Time window in seconds

// Token bucket rate limiter
async function rateLimit(ip: string): Promise<{ success: boolean; remaining: number; reset: number }> {
  const key = `ratelimit:${ip}`
  
  // Get current bucket state
  const bucket = await redis.get<{ tokens: number; lastRefill: number }>(key)
  const now = Date.now()
  
  if (!bucket) {
    // Initialize bucket with max tokens
    await redis.set(key, {
      tokens: RATE_LIMIT_MAX - 1,
      lastRefill: now
    })
    return { success: true, remaining: RATE_LIMIT_MAX - 1, reset: now + RATE_LIMIT_WINDOW * 1000 }
  }

  // Calculate time passed since last refill
  const timePassed = Math.floor((now - bucket.lastRefill) / 1000)
  const tokensToAdd = Math.floor(timePassed / RATE_LIMIT_WINDOW)
  
  if (tokensToAdd > 0) {
    // Refill tokens
    const newTokens = Math.min(bucket.tokens + tokensToAdd, RATE_LIMIT_MAX)
    const newLastRefill = bucket.lastRefill + (tokensToAdd * RATE_LIMIT_WINDOW * 1000)
    
    await redis.set(key, {
      tokens: newTokens - 1,
      lastRefill: newLastRefill
    })
    
    return { 
      success: true, 
      remaining: newTokens - 1,
      reset: newLastRefill + RATE_LIMIT_WINDOW * 1000
    }
  }

  // No tokens available
  if (bucket.tokens <= 0) {
    return { 
      success: false, 
      remaining: 0,
      reset: bucket.lastRefill + RATE_LIMIT_WINDOW * 1000
    }
  }

  // Consume one token
  await redis.set(key, {
    tokens: bucket.tokens - 1,
    lastRefill: bucket.lastRefill
  })

  return { 
    success: true, 
    remaining: bucket.tokens - 1,
    reset: bucket.lastRefill + RATE_LIMIT_WINDOW * 1000
  }
}

export async function middleware(request: NextRequest) {
  // Only apply rate limiting to API routes
  if (!request.nextUrl.pathname.startsWith('/api')) {
    return NextResponse.next()
  }

  // Get client IP from headers
  const forwardedFor = request.headers.get('x-forwarded-for')
  const ip = forwardedFor ? forwardedFor.split(',')[0] : '127.0.0.1'
  
  // Check rate limit
  const { success, remaining, reset } = await rateLimit(ip)
  
  // Add rate limit headers
  const response = success 
    ? NextResponse.next() 
    : NextResponse.json({ error: "Rate Limited" }, { status: 429 })
  
  response.headers.set('X-RateLimit-Limit', RATE_LIMIT_MAX.toString())
  response.headers.set('X-RateLimit-Remaining', remaining.toString())
  response.headers.set('X-RateLimit-Reset', reset.toString())
  
  return response
}

export const config = {
  matcher: '/api/:path*',
}