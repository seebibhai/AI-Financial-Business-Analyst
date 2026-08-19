const mongoose = require('mongoose');

/**
 * Connects to MongoDB Atlas using MONGODB_URI.
 * Fails fast with a clear message if the variable is missing or the
 * connection cannot be established, instead of letting the app run
 * against a broken database.
 */
async function connectDB() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.error(
      '[db] MONGODB_URI is not set. Copy .env.example to server/.env and add your MongoDB Atlas connection string.'
    );
    process.exit(1);
  }

  try {
    mongoose.set('strictQuery', true);
    const conn = await mongoose.connect(uri);
    console.log(`[db] MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);

    mongoose.connection.on('error', (err) => {
      console.error('[db] MongoDB connection error:', err.message);
    });
    mongoose.connection.on('disconnected', () => {
      console.warn('[db] MongoDB disconnected');
    });
  } catch (err) {
    console.error('[db] Failed to connect to MongoDB Atlas:', err.message);
    process.exit(1);
  }
}

module.exports = connectDB;
