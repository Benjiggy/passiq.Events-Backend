/**
 * One-time migration script: backfill statsToken on existing events
 * Run: node scripts/backfill-stats-tokens.js
 */
require("dotenv").config();
const crypto = require("crypto");
const mongoose = require("mongoose");
const Event = require("../src/models/Event");

async function backfill() {
  const uri = process.env.DB || process.env.MONGODB_URI || process.env.DATABASE_URL;
  if (!uri) {
    console.error("No database connection string found in environment (DB / MONGODB_URI)");
    process.exit(1);
  }

  console.log("Connecting to MongoDB...");
  await mongoose.connect(uri);
  console.log("Connected to MongoDB.");

  const eventsWithoutToken = await Event.find({
    $or: [
      { statsToken: { $exists: false } },
      { statsToken: null },
      { statsToken: "" },
    ],
  });

  console.log(`Found ${eventsWithoutToken.length} events needing a statsToken.`);

  let updatedCount = 0;
  for (const event of eventsWithoutToken) {
    const token = crypto.randomBytes(24).toString("hex");
    await Event.updateOne({ _id: event._id }, { $set: { statsToken: token } });
    updatedCount++;
    console.log(`Updated event "${event.title}" (${event._id}) with token ${token.slice(0, 8)}...`);
  }

  console.log(`Successfully backfilled statsToken for ${updatedCount} events.`);
  await mongoose.disconnect();
  console.log("Disconnected from MongoDB.");
}

backfill().catch((err) => {
  console.error("Backfill failed:", err);
  process.exit(1);
});
