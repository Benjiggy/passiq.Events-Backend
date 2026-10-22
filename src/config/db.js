const mongoose = require("mongoose");
require("dotenv").config();

const db = process.env.DB || process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/passiq_events";

// readyState: 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
const isDbConnected = () => mongoose.connection.readyState === 1;

const connectDB = async () => {
  try {
    await mongoose.connect(db);
    console.log("Database connection established");
  } catch (err) {
    console.log(`Error connecting to database: ${err.message}`);
  }
};

module.exports = { connectDB, isDbConnected };
