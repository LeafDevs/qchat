import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/settings/limits?userId=xxx
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
        return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    try {
        // Get the user's request limit
        const limit = await db.get(
            'SELECT * FROM requestLimit WHERE userId = ?',
            [userId]
        )
        return NextResponse.json(limit ? [limit] : [])
    } catch (error) {
        console.error('Error fetching request limit:', error)
        return NextResponse.json({ error: 'Failed to fetch request limit' }, { status: 500 })
    }
}

// POST /api/settings/limits
export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { userId, maxRequests } = body

        if (!userId) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        const now = new Date()
        const resetAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) // Reset in 30 days

        // Check if limit already exists
        const existingLimit = await db.get(
            'SELECT * FROM requestLimit WHERE userId = ?',
            [userId]
        )

        if (existingLimit) {
            // Update existing limit
            await db.run(
                `UPDATE requestLimit 
                 SET maxRequests = ?, updatedAt = ?
                 WHERE userId = ?`,
                [maxRequests || 250, now.toISOString(), userId]
            )
            return NextResponse.json({ ...existingLimit, maxRequests: maxRequests || 250 })
        }

        // Create new limit
        const id = crypto.randomUUID()
        await db.run(
            `INSERT INTO requestLimit (
                id, userId, requestCount, maxRequests, resetAt, createdAt, updatedAt
            ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                id, userId, 0, maxRequests || 250,
                resetAt.toISOString(), now.toISOString(), now.toISOString()
            ]
        )

        return NextResponse.json({ id, ...body })
    } catch (error) {
        console.error('Error managing request limit:', error)
        return NextResponse.json({ error: 'Failed to manage request limit' }, { status: 500 })
    }
}

// PATCH /api/settings/limits/:id
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
    try {
        const body = await request.json()
        const { requestCount, maxRequests } = body
        const id = params.id

        const now = new Date()
        const updates = []
        const values = []

        if (requestCount !== undefined) {
            updates.push('requestCount = ?')
            values.push(requestCount)
        }
        if (maxRequests !== undefined) {
            updates.push('maxRequests = ?')
            values.push(maxRequests)
        }

        if (updates.length === 0) {
            return NextResponse.json({ error: 'No updates provided' }, { status: 400 })
        }

        updates.push('updatedAt = ?')
        values.push(now.toISOString())
        values.push(id)

        await db.run(
            `UPDATE requestLimit SET ${updates.join(', ')} WHERE id = ?`,
            values
        )

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error updating request limit:', error)
        return NextResponse.json({ error: 'Failed to update request limit' }, { status: 500 })
    }
} 