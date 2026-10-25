// MongoDB connection using Mongoose.
// If MONGODB_URI is missing or looks like a placeholder, the server refuses to start.
// In-memory MongoDB is only allowed when NODE_ENV=test or USE_MEMORY_DB=true explicitly.
const mongoose = require('mongoose');

let dbPromise = null;

async function connectDB() {
  const uri = process.env.MONGODB_URI;

  // In-memory mode: only permitted in explicit test/dev override
  const useMemory = process.env.USE_MEMORY_DB === 'true' || process.env.NODE_ENV === 'test';

  if (!uri || uri.includes('<username>') || uri.includes('<password>') || uri.includes('user:password') || uri === 'xxxxxxx' || uri === 'xxxxxxxx') {
    if (useMemory) {
      console.warn('[DB] MONGODB_URI not set — starting in-memory MongoDB for testing.');
      try {
        const { MongoMemoryServer } = require('mongodb-memory-server');
        const mongoServer = await MongoMemoryServer.create({ binary: { version: '4.2.24' } });
        const memUri = mongoServer.getUri();
        console.log(`[DB] In-memory MongoDB started at: ${memUri}`);
        await mongoose.connect(memUri);
        console.log('[DB] Connected to in-memory MongoDB');
        return;
      } catch (err) {
        console.error('[DB] Failed to start in-memory MongoDB:', err.message);
        process.exit(1);
      }
    }

    // Production guard: never silently fall back
    console.error('');
    console.error('FATAL: MONGODB_URI is not configured or contains a placeholder value.');
    console.error('Set a valid MongoDB Atlas or self-hosted MongoDB connection string in your .env file.');
    console.error('Example: MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/dbname');
    console.error('');
    process.exit(1);
  }

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000, // Fail fast if MongoDB is unreachable
    });
    console.log('[DB] Connected to MongoDB');
  } catch (error) {
    console.error('[DB] MongoDB connection error:', error.message);
    process.exit(1);
  }
}

dbPromise = connectDB();

module.exports = { mongoose, dbPromise };
