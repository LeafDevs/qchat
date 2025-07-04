import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/settings/keys?userId=xxx
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
        return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    try {
        const keys = await db.all(
            'SELECT * FROM apiKey WHERE userId = ?',
            [userId]
        )
        return NextResponse.json(keys)
    } catch (error) {
        console.error('Error fetching API keys:', error)
        return NextResponse.json({ error: 'Failed to fetch API keys' }, { status: 500 })
    }
}

// POST /api/settings/keys
export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { userId, provider, key, enabled = true, isCustom, customName, customBaseUrl } = body

        if (!userId || !provider || !key) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        const id = crypto.randomUUID()
        const now = new Date().toISOString()

        await db.run(
            `INSERT INTO apiKey (id, userId, provider, key, enabled, isCustom, customName, customBaseUrl, createdAt, updatedAt)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, userId, provider, key, enabled ? 1 : 0, isCustom ? 1 : 0, customName, customBaseUrl, now, now]
        )

        return NextResponse.json({ id, ...body })
    } catch (error) {
        console.error('Error adding API key:', error)
        return NextResponse.json({ error: 'Failed to add API key' }, { status: 500 })
    }
}

// PUT /api/settings/keys/:id
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params
        const body = await request.json()
        const { key, enabled } = body

        if (key !== undefined) {
            await db.run(
                'UPDATE apiKey SET key = ?, updatedAt = ? WHERE id = ?',
                [key, new Date().toISOString(), id]
            )
        }

        if (enabled !== undefined) {
            await db.run(
                'UPDATE apiKey SET enabled = ?, updatedAt = ? WHERE id = ?',
                [enabled ? 1 : 0, new Date().toISOString(), id]
            )
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error updating API key:', error)
        return NextResponse.json({ error: 'Failed to update API key' }, { status: 500 })
    }
}

// DELETE /api/settings/keys/:id
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params
        await db.run('DELETE FROM apiKey WHERE id = ?', [id])
        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error deleting API key:', error)
        return NextResponse.json({ error: 'Failed to delete API key' }, { status: 500 })
    }
} 