import { NextResponse } from 'next/server'
import { redis } from '@/lib/redis'

export async function POST(req: Request) {
  try {
    // Get client IP from headers (same logic as middleware)
    const forwardedFor = req.headers.get('x-forwarded-for')
    const ip = forwardedFor ? forwardedFor.split(',')[0] : '127.0.0.1'
    
    // Delete the rate limit key from Redis
    const key = `ratelimit:${ip}`
    await redis.del(key)
    
    console.log(`[Rate Limit Reset] Reset rate limit for IP: ${ip}`)
    
    return NextResponse.json({ 
      success: true, 
      message: 'Rate limit reset successfully',
      ip: ip 
    })
  } catch (error) {
    console.error('Error resetting rate limit:', error)
    return NextResponse.json(
      { error: 'Failed to reset rate limit' },
      { status: 500 }
    )
  }
} 