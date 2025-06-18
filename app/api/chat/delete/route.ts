import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const chatId = searchParams.get('chatId');
    const userId = searchParams.get('userId');

    if (!chatId || !userId) {
      return NextResponse.json(
        { error: 'chatId and userId are required' },
        { status: 400 }
      );
    }

    // Verify chat ownership
    const chat = await db.get(
      'SELECT * FROM chat WHERE id = ? AND createdBy = ?',
      [chatId, userId]
    );

    if (!chat) {
      return NextResponse.json(
        { error: 'Chat not found or unauthorized' },
        { status: 404 }
      );
    }

    // Delete all messages in the chat
    await db.run('DELETE FROM message WHERE chatId = ?', [chatId]);
    
    // Delete all chat participants
    await db.run('DELETE FROM chatParticipant WHERE chatId = ?', [chatId]);
    
    // Delete the chat
    await db.run('DELETE FROM chat WHERE id = ?', [chatId]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting chat:', error);
    return NextResponse.json(
      { error: 'Failed to delete chat' },
      { status: 500 }
    );
  }
} 