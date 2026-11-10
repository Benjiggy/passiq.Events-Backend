/**
 * One-time migration script: backfill unique `code`, `holderName`, `holderEmail`, `ticketType` on existing tickets
 * Run: node scripts/backfill-ticket-codes.js
 */
require("dotenv").config();
const crypto = require("crypto");
const mongoose = require("mongoose");
const Ticket = require("../src/models/Ticket");

async function backfill() {
  const uri = process.env.DB || process.env.MONGODB_URI || process.env.DATABASE_URL;
  if (!uri) {
    console.error("No database connection string found in environment (DB / MONGODB_URI)");
    process.exit(1);
  }

  console.log("Connecting to MongoDB...");
  await mongoose.connect(uri);
  console.log("Connected to MongoDB.");

  const ticketsNeedingBackfill = await Ticket.find({
    $or: [
      { code: { $exists: false } },
      { code: null },
      { code: "" },
      { holderName: { $exists: false } },
      { holderName: "" },
      { ticketType: { $exists: false } },
      { ticketType: "" }
    ]
  });

  console.log(`Found ${ticketsNeedingBackfill.length} tickets needing backfill.`);

  let updatedCount = 0;
  for (const ticket of ticketsNeedingBackfill) {
    const existingCode = ticket.code || ticket.ticketCode;
    const finalCode = existingCode && existingCode.trim().length >= 12
      ? existingCode.trim().toUpperCase()
      : `PQ-${crypto.randomBytes(6).toString("hex").toUpperCase()}`;

    const updateSet = {
      code: finalCode,
      ticketCode: ticket.ticketCode || finalCode,
      holderName: ticket.holderName || ticket.userName || "Attendee",
      holderEmail: ticket.holderEmail || ticket.userEmail || "",
      ticketType: ticket.ticketType || ticket.tierName || "Regular"
    };

    if (ticket.checkedInAt && !ticket.usedAt) {
      updateSet.usedAt = ticket.checkedInAt;
    }
    if (ticket.checkedInBy && !ticket.usedBy) {
      updateSet.usedBy = ticket.checkedInBy;
    }

    await Ticket.updateOne({ _id: ticket._id }, { $set: updateSet });
    updatedCount++;
    console.log(`Updated ticket ${ticket._id}: Code = ${finalCode}, Holder = ${updateSet.holderName}`);
  }

  console.log(`Successfully backfilled ${updatedCount} tickets.`);
  await mongoose.disconnect();
  console.log("Disconnected from MongoDB.");
}

backfill().catch((err) => {
  console.error("Backfill failed:", err);
  process.exit(1);
});
