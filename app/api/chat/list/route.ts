import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    // Get all chats for the user, ordered by last message time
    const chats = await db.all(`
      SELECT 
        c.id,
        c.model,
        c.createdAt,
        c.updatedAt,
        (
          SELECT content 
          FROM message 
          WHERE chatId = c.id 
          ORDER BY createdAt DESC 
          LIMIT 1
        ) as lastMessage,
        (
          SELECT createdAt 
          FROM message 
          WHERE chatId = c.id 
          ORDER BY createdAt DESC 
          LIMIT 1
        ) as lastMessageTime
      FROM chat c
      WHERE c.createdBy = ?
      ORDER BY lastMessageTime DESC
    `, [userId]);

    return NextResponse.json(chats);
  } catch (error) {
    console.error('Error fetching chats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch chats' },
      { status: 500 }
    );
  }
} 