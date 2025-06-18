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
        const { userId, provider, key, isCustom, customName, customBaseUrl } = body

        if (!userId || !provider || !key) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        const id = crypto.randomUUID()
        const now = new Date().toISOString()

        await db.run(
            `INSERT INTO apiKey (id, userId, provider, key, isCustom, customName, customBaseUrl, createdAt, updatedAt)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, userId, provider, key, isCustom ? 1 : 0, customName, customBaseUrl, now, now]
        )

        return NextResponse.json({ id, ...body })
    } catch (error) {
        console.error('Error adding API key:', error)
        return NextResponse.json({ error: 'Failed to add API key' }, { status: 500 })
    }
}

// DELETE /api/settings/keys/:id
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
    try {
        const id = params.id
        await db.run('DELETE FROM apiKey WHERE id = ?', [id])
        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error deleting API key:', error)
        return NextResponse.json({ error: 'Failed to delete API key' }, { status: 500 })
    }
} 