import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(req: Request) {
  try {
    const { userId, systemPrompt, defaultModel } = await req.json()

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    // Check if user has existing preferences
    const existingPreferences = await db.get(
      'SELECT * FROM userPreferences WHERE userId = ?',
      [userId]
    )

    if (existingPreferences) {
      // Update existing preferences
      await db.run(
        'UPDATE userPreferences SET systemPrompt = ?, defaultModel = ?, updatedAt = ? WHERE userId = ?',
        [systemPrompt || '', defaultModel || 'gpt-4.1', new Date().toISOString(), userId]
      )
    } else {
      // Create new preferences
      const id = crypto.randomUUID()
      const now = new Date()
      await db.run(
        `INSERT INTO userPreferences (
          id, userId, systemPrompt, defaultModel, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?)`,
        [
          id, userId, systemPrompt || '', defaultModel || 'gpt-4.1',
          now.toISOString(), now.toISOString()
        ]
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error saving preferences:', error)
    return NextResponse.json(
      { error: 'Failed to save preferences' },
      { status: 500 }
    )
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    const preferences = await db.get(
      'SELECT * FROM userPreferences WHERE userId = ?',
      [userId]
    )

    return NextResponse.json(preferences || { systemPrompt: '', defaultModel: 'gpt-4.1' })
  } catch (error) {
    console.error('Error fetching preferences:', error)
    return NextResponse.json(
      { error: 'Failed to fetch preferences' },
      { status: 500 }
    )
  }
} 