const mongoose = require("mongoose");
require("dotenv").config();

const db = process.env.DB || process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/passiq_events";

// readyState: 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
const isDbConnected = () => mongoose.connection.readyState === 1;

const connectDB = async () => {
  try {
    await mongoose.connect(db);
    console.log("Database connection established");

    // Automatic idempotent backfill of statsToken for existing events
    try {
      const crypto = require("crypto");
      const rawEventsWithoutToken = await mongoose.connection
        .collection("events")
        .find({
          $or: [
            { statsToken: { $exists: false } },
            { statsToken: null },
            { statsToken: "" },
          ],
        })
        .toArray();

      if (rawEventsWithoutToken && rawEventsWithoutToken.length > 0) {
        for (const ev of rawEventsWithoutToken) {
          const token = crypto.randomBytes(24).toString("hex");
          await mongoose.connection
            .collection("events")
            .updateOne({ _id: ev._id }, { $set: { statsToken: token } });
          console.log(`Backfilled statsToken for event ${ev._id}`);
        }
      }
    } catch (backfillErr) {
      console.warn("statsToken startup backfill note:", backfillErr.message);
    }
  } catch (err) {
    console.log(`Error connecting to database: ${err.message}`);
  }
};

module.exports = { connectDB, isDbConnected };
