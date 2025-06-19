import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { userId, model = 'gpt-4', title = null } = await req.json();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    const chatId = crypto.randomUUID();
    const now = new Date();

    // Create the chat
    await db.run(
      'INSERT INTO chat (id, createdBy, model, title, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)',
      [chatId, userId, model, title, now, now]
    );

    // Add the user as a participant
    await db.run(
      'INSERT INTO chatParticipant (id, chatId, userId, joinedAt) VALUES (?, ?, ?, ?)',
      [crypto.randomUUID(), chatId, userId, now]
    );

    return NextResponse.json({ chatId });
  } catch (error) {
    console.error('Error creating chat:', error);
    return NextResponse.json(
      { error: 'Failed to create chat' },
      { status: 500 }
    );
  }
} 