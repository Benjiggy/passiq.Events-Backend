// Run in mongosh against your database:
//   mongosh "<your-connection-string>" fix-marlians-fest.mongosh.js
//
// 1. Leave APPLY = false first. It only prints what would change.
// 2. Check the output, then set APPLY = true and run again.
// A backup copy of the event is saved before anything is written.

const EVENT_ID = ObjectId("6ad8cdaa04730d435e513b1a");
const APPLY = false;

const event = db.events.findOne({ _id: EVENT_ID });
if (!event) throw new Error("Event not found");

// Real sales per tier, taken from the tickets collection
const counts = {};
db.tickets
  .aggregate([
    {
      $match: {
        eventId: EVENT_ID,
        status: { $in: ["valid", "used"] },
        isDemo: { $ne: true },
      },
    },
    { $group: { _id: "$tierId", sold: { $sum: 1 } } },
  ])
  .forEach((r) => (counts[String(r._id)] = r.sold));

const $set = {};
const preview = [];
let totalSold = 0;

event.ticketTiers.forEach((t, i) => {
  const sold = counts[String(t._id)] || 0;
  totalSold += sold;
  $set[`ticketTiers.${i}.sold`] = sold;
  $set[`ticketTiers.${i}.isSoldOut`] = t.capacity > 0 && sold >= t.capacity;
  preview.push({
    tier: t.name,
    capacity: t.capacity,
    soldNow: t.sold,
    soldReal: sold,
  });
});

const prices = event.ticketTiers.map((t) => t.price);
$set.soldCount = totalSold;
$set.price = Math.min(...prices);
$set.minPrice = Math.min(...prices);
$set.maxPrice = Math.max(...prices);

// The organizer object is empty in the database
$set["organizer.name"] = "House Of Naya";
$set["organizer.handle"] = "Admin-House Of Naya";
$set["organizer.verified"] = true;
$set["organizer.partner"] = "KRD (Kelvin Records)";
$set["organizer.officialPartner"] = "KRD (Kelvin Records)";
$set["organizer.enquiries"] = "+234 916 063 7438, +234 708 819 8268";
$set.updatedAt = new Date();

print("Tiers:");
printjson(preview);
print(`soldCount: ${event.soldCount} -> ${totalSold}`);
print(`price range: ${$set.minPrice} - ${$set.maxPrice}`);

if (!APPLY) {
  print("\nDRY RUN. Nothing was written. Set APPLY = true to apply.");
} else {
  const backupName =
    "events_backup_" + new Date().toISOString().slice(0, 10).replace(/-/g, "");
  db.getCollection(backupName).insertOne(event);
  const res = db.events.updateOne({ _id: EVENT_ID }, { $set });
  print(`\nBackup saved in "${backupName}". Updated: ${res.modifiedCount}`);
}
