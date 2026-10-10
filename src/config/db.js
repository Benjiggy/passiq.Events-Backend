const mongoose = require('mongoose');

let isConnected = false;

const connectDB = async () => {
  if (isConnected) return;

  const mongoURI = process.env.MONGODB_URI;

  if (!mongoURI || mongoURI === 'memory') {
    console.log('[Database] Running in in-memory hybrid storage mode.');
    isConnected = false;
    return;
  }

  try {
    const conn = await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 1000, // 1s timeout
    });

    isConnected = true;
    console.log(`[Database] MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.log(`[Database] Running in in-memory hybrid storage mode (MongoDB not connected: ${error.message}).`);
    isConnected = false;
  }
};

const isDbConnected = () => isConnected;

module.exports = { connectDB, isDbConnected };
