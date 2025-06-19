import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { userId, chatId, messageId } = await req.json();

    if (!userId || !chatId || !messageId) {
      return NextResponse.json(
        { error: 'userId, chatId and messageId are required' },
        { status: 400 }
      );
    }

    // Verify chat ownership
    const originalChat = await db.get(
      'SELECT * FROM chat WHERE id = ? AND createdBy = ?',
      [chatId, userId]
    );

    if (!originalChat) {
      return NextResponse.json(
        { error: 'Chat not found or unauthorized' },
        { status: 404 }
      );
    }

    // Verify branch message exists within chat
    const branchMessage = await db.get(
      'SELECT * FROM message WHERE id = ? AND chatId = ?',
      [messageId, chatId]
    );

    if (!branchMessage) {
      return NextResponse.json(
        { error: 'Message not found in the specified chat' },
        { status: 404 }
      );
    }

    // Create new chat
    const newChatId = crypto.randomUUID();
    const now = new Date();

    // Determine the new title
    let originalTitle = originalChat.title;
    if (!originalTitle) {
      // Fallback: use the last message content
      const lastMsg = await db.get(
        'SELECT content FROM message WHERE chatId = ? ORDER BY createdAt DESC LIMIT 1',
        [chatId]
      );
      originalTitle = lastMsg?.content ? lastMsg.content.slice(0, 100) : 'Branched Chat';
    }
    const branchedTitle = '[BRANCH] ' + originalTitle;

    await db.run(
      `INSERT INTO chat (
        id, createdBy, model, title, parentChatId, branchMessageId, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [newChatId, userId, originalChat.model, branchedTitle, chatId, messageId, now, now]
    );

    // Add the user as participant of the new chat
    await db.run(
      'INSERT INTO chatParticipant (id, chatId, userId, joinedAt) VALUES (?, ?, ?, ?)',
      [crypto.randomUUID(), newChatId, userId, now]
    );

    // Copy messages up to and including the branch message (ordered by createdAt)
    const messagesToCopy = await db.all(
      'SELECT * FROM message WHERE chatId = ? AND createdAt <= ? ORDER BY createdAt ASC',
      [chatId, branchMessage.createdAt]
    );

    for (let i = 0; i < messagesToCopy.length; i++) {
      const msg = messagesToCopy[i];
      let content = msg.content;
      // If this is the last assistant message, prepend [BRANCH] tag
      if (i === messagesToCopy.length - 1 && msg.role === 'assistant') {
        content = '[BRANCH] ' + content;
      }
      await db.run(
        `INSERT INTO message (
          id, chatId, content, role, status, model, previousContent, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          crypto.randomUUID(),
          newChatId,
          content,
          msg.role,
          msg.status,
          msg.model,
          msg.previousContent,
          msg.createdAt,
          msg.updatedAt,
        ]
      );
    }

    return NextResponse.json({ chatId: newChatId });
  } catch (error) {
    console.error('Error branching chat:', error);
    return NextResponse.json(
      { error: 'Failed to branch chat' },
      { status: 500 }
    );
  }
} 