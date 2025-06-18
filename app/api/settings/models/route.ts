import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/settings/models?userId=xxx
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
        return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    try {
        const models = await db.all(
            'SELECT * FROM customModel WHERE userId = ?',
            [userId]
        )
        return NextResponse.json(models)
    } catch (error) {
        console.error('Error fetching custom models:', error)
        return NextResponse.json({ error: 'Failed to fetch custom models' }, { status: 500 })
    }
}

// POST /api/settings/models
export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { 
            userId, 
            name, 
            provider, 
            hasFileUpload, 
            hasVision, 
            hasThinking, 
            hasPDFManipulation, 
            hasSearch 
        } = body

        if (!userId || !name || !provider) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        const id = crypto.randomUUID()
        const now = new Date().toISOString()

        await db.run(
            `INSERT INTO customModel (
                id, userId, name, provider, 
                hasFileUpload, hasVision, hasThinking, 
                hasPDFManipulation, hasSearch, 
                createdAt, updatedAt
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                id, userId, name, provider,
                hasFileUpload ? 1 : 0, hasVision ? 1 : 0, hasThinking ? 1 : 0,
                hasPDFManipulation ? 1 : 0, hasSearch ? 1 : 0,
                now, now
            ]
        )

        return NextResponse.json({ id, ...body })
    } catch (error) {
        console.error('Error adding custom model:', error)
        return NextResponse.json({ error: 'Failed to add custom model' }, { status: 500 })
    }
}

// DELETE /api/settings/models/:id
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params
        await db.run('DELETE FROM customModel WHERE id = ?', [id])
        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error removing custom model:', error)
        return NextResponse.json({ error: 'Failed to remove custom model' }, { status: 500 })
    }
} 