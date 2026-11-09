const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("crypto");

// We can test the controller logic directly
const PublicStatsController = require("../src/controllers/publicStats.controller");
const dataStore = require("../src/models/dataStore");

test("PublicStatsController rejects missing or incorrect token with 404", async () => {
  const dummyEvent = {
    id: "test-event-123",
    _id: "test-event-123",
    title: "Afrobeats Gala",
    slug: "afrobeats-gala",
    statsToken: crypto.randomBytes(24).toString("hex"),
  };
  dataStore.memory.events.push(dummyEvent);

  let statusSent = null;
  let jsonSent = null;

  const res = {
    status(code) {
      statusSent = code;
      return this;
    },
    json(payload) {
      jsonSent = payload;
      return this;
    },
  };

  // 1. Missing token
  await PublicStatsController.getEventStats(
    { params: { eventId: "test-event-123" }, query: {} },
    res,
    () => {}
  );
  assert.equal(statusSent, 404);
  assert.equal(jsonSent.success, false);

  // 2. Wrong token length
  await PublicStatsController.getEventStats(
    { params: { eventId: "test-event-123" }, query: { token: "short" } },
    res,
    () => {}
  );
  assert.equal(statusSent, 404);
  assert.equal(jsonSent.success, false);

  // 3. Wrong token same length
  const wrongToken = crypto.randomBytes(24).toString("hex");
  await PublicStatsController.getEventStats(
    { params: { eventId: "test-event-123" }, query: { token: wrongToken } },
    res,
    () => {}
  );
  assert.equal(statusSent, 404);
  assert.equal(jsonSent.success, false);

  // 4. Non-existent event
  await PublicStatsController.getEventStats(
    { params: { eventId: "does-not-exist" }, query: { token: dummyEvent.statsToken } },
    res,
    () => {}
  );
  assert.equal(statusSent, 404);
  assert.equal(jsonSent.success, false);

  // 5. Correct token returns ONLY eventName, ticketsSold, lastUpdated
  await PublicStatsController.getEventStats(
    { params: { eventId: "test-event-123" }, query: { token: dummyEvent.statsToken } },
    res,
    () => {}
  );
  assert.equal(statusSent, 200);
  assert.equal(jsonSent.eventName, "Afrobeats Gala");
  assert.equal(typeof jsonSent.ticketsSold, "number");
  assert.ok(jsonSent.lastUpdated);
  // Ensure sensitive data is NOT returned
  assert.equal(jsonSent.revenue, undefined);
  assert.equal(jsonSent.attendees, undefined);
  assert.equal(jsonSent.email, undefined);
  assert.equal(jsonSent.phone, undefined);
});
