import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(req: Request) {
  try {
    const { userId } = await req.json()

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    // Check if user has an existing request limit
    const existingLimit = await db.get(
      'SELECT * FROM requestLimit WHERE userId = ?',
      [userId]
    )

    if (existingLimit) {
      // Reset the existing limit
      await db.run(
        'UPDATE requestLimit SET requestCount = 0, updatedAt = ? WHERE userId = ?',
        [new Date().toISOString(), userId]
      )
    } else {
      // Create a new limit with 0 requests
      const id = crypto.randomUUID()
      const now = new Date()
      const resetAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) // Reset in 30 days

      await db.run(
        `INSERT INTO requestLimit (
          id, userId, requestCount, maxRequests, resetAt, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          id, userId, 0, 250,
          resetAt.toISOString(), now.toISOString(), now.toISOString()
        ]
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error resetting request limit:', error)
    return NextResponse.json(
      { error: 'Failed to reset request limit' },
      { status: 500 }
    )
  }
} 