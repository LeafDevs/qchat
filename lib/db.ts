import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

// Open a SQLite database connection
const dbPromise = open({
  filename: 'auth.sqlite',
  driver: sqlite3.Database
});

// Ensure tables exist before any operation
async function ensureTables() {
  const db = await dbPromise;
  
  // First, check if the status column exists in the message table
  const messageTableInfo = await db.all("PRAGMA table_info(message)");
  const hasStatusColumn = messageTableInfo.some((col: any) => col.name === 'status');

  // Check for model column
  const hasModelColumn = messageTableInfo.some((col: any) => col.name === 'model');

  // Check for previousContent column
  const hasPreviousContentColumn = messageTableInfo.some((col: any) => col.name === 'previousContent');

  // Check for enabled column in apiKey table
  const apiKeyTableInfo = await db.all("PRAGMA table_info(apiKey)");
  const hasEnabledColumn = apiKeyTableInfo.some((col: any) => col.name === 'enabled');

  // Add CREATE TABLE IF NOT EXISTS statements for all required tables
  await db.exec(`
    CREATE TABLE IF NOT EXISTS user (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE,
      name TEXT,
      createdAt DATETIME,
      updatedAt DATETIME
    );
    CREATE TABLE IF NOT EXISTS chat (
      id TEXT PRIMARY KEY,
      createdBy TEXT,
      model TEXT,
      createdAt DATETIME,
      updatedAt DATETIME
    );
    CREATE TABLE IF NOT EXISTS message (
      id TEXT PRIMARY KEY,
      chatId TEXT,
      content TEXT,
      role TEXT,
      status TEXT DEFAULT 'complete',
      previousContent TEXT,
      createdAt DATETIME,
      updatedAt DATETIME,
      FOREIGN KEY (chatId) REFERENCES chat(id)
    );
    CREATE TABLE IF NOT EXISTS chatParticipant (
      id TEXT PRIMARY KEY,
      chatId TEXT,
      userId TEXT,
      joinedAt DATETIME,
      FOREIGN KEY (chatId) REFERENCES chat(id),
      FOREIGN KEY (userId) REFERENCES user(id)
    );
    CREATE TABLE IF NOT EXISTS session (
      id TEXT PRIMARY KEY,
      userId TEXT,
      expiresAt DATETIME,
      FOREIGN KEY (userId) REFERENCES user(id)
    );
    CREATE TABLE IF NOT EXISTS account (
      id TEXT PRIMARY KEY,
      userId TEXT,
      provider TEXT,
      providerAccountId TEXT,
      FOREIGN KEY (userId) REFERENCES user(id)
    );
    CREATE TABLE IF NOT EXISTS verification (
      id TEXT PRIMARY KEY,
      userId TEXT,
      token TEXT,
      expiresAt DATETIME,
      FOREIGN KEY (userId) REFERENCES user(id)
    );
    CREATE TABLE IF NOT EXISTS apiKey (
      id TEXT PRIMARY KEY,
      userId TEXT,
      provider TEXT,
      key TEXT,
      enabled BOOLEAN DEFAULT true,
      isCustom BOOLEAN DEFAULT false,
      customName TEXT,
      customBaseUrl TEXT,
      createdAt DATETIME,
      updatedAt DATETIME,
      FOREIGN KEY (userId) REFERENCES user(id)
    );
    CREATE TABLE IF NOT EXISTS customModel (
      id TEXT PRIMARY KEY,
      userId TEXT,
      name TEXT,
      provider TEXT,
      hasFileUpload BOOLEAN DEFAULT false,
      hasVision BOOLEAN DEFAULT false,
      hasThinking BOOLEAN DEFAULT false,
      hasPDFManipulation BOOLEAN DEFAULT false,
      hasSearch BOOLEAN DEFAULT false,
      createdAt DATETIME,
      updatedAt DATETIME,
      FOREIGN KEY (userId) REFERENCES user(id)
    );
    CREATE TABLE IF NOT EXISTS requestLimit (
      id TEXT PRIMARY KEY,
      userId TEXT UNIQUE,
      requestCount INTEGER DEFAULT 0,
      maxRequests INTEGER DEFAULT 250,
      resetAt DATETIME,
      createdAt DATETIME,
      updatedAt DATETIME,
      FOREIGN KEY (userId) REFERENCES user(id)
    );
  `);

  // If the status column doesn't exist, add it
  if (!hasStatusColumn) {
    try {
      await db.exec(`
        ALTER TABLE message ADD COLUMN status TEXT DEFAULT 'complete';
        UPDATE message SET status = 'complete' WHERE status IS NULL;
      `);
      console.log('Added status column to message table');
    } catch (error) {
      console.error('Error adding status column:', error);
    }
  }

  // If the model column doesn't exist, add it
  if (!hasModelColumn) {
    try {
      await db.exec(`
        ALTER TABLE message ADD COLUMN model TEXT;
      `);
      console.log('Added model column to message table');
    } catch (error) {
      console.error('Error adding model column:', error);
    }
  }

  // If the previousContent column doesn't exist, add it
  if (!hasPreviousContentColumn) {
    try {
      await db.exec(`
        ALTER TABLE message ADD COLUMN previousContent TEXT;
      `);
      console.log('Added previousContent column to message table');
    } catch (error) {
      console.error('Error adding previousContent column:', error);
    }
  }

  // If the enabled column doesn't exist in apiKey table, add it
  if (!hasEnabledColumn) {
    try {
      await db.exec(`
        ALTER TABLE apiKey ADD COLUMN enabled BOOLEAN DEFAULT true;
        UPDATE apiKey SET enabled = true WHERE enabled IS NULL;
      `);
      console.log('Added enabled column to apiKey table');
    } catch (error) {
      console.error('Error adding enabled column:', error);
    }
  }
}

// Initialize tables
ensureTables().catch(console.error);

// Export a db object that can be used to run SQL queries
export const db = {
  async get(sql: string, params: any[] = []) {
    const db = await dbPromise;
    return db.get(sql, params);
  },
  async all(sql: string, params: any[] = []) {
    const db = await dbPromise;
    return db.all(sql, params);
  },
  async run(sql: string, params: any[] = []) {
    const db = await dbPromise;
    return db.run(sql, params);
  }
}; 