const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("crypto");
const dataStore = require("../src/models/dataStore");
const CheckinController = require("../src/controllers/checkin.controller");

test("Check-in: 20 simultaneous scans of one code - exactly one succeeds", async () => {
  const eventId = "ev_concurrency_test_" + Date.now();
  const ticketCode = "PQ-" + crypto.randomBytes(6).toString("hex").toUpperCase();

  // Create ticket in dataStore memory
  const ticket = {
    id: "tkt_concur_1",
    _id: "tkt_concur_1",
    code: ticketCode,
    ticketCode: ticketCode,
    eventId: eventId,
    holderName: "Ada Lovelace",
    userName: "Ada Lovelace",
    holderEmail: "ada@example.com",
    userEmail: "ada@example.com",
    ticketType: "VIP",
    tierName: "VIP",
    status: "valid",
    eventTitle: "Tech Conference 2026",
    usedAt: null,
    checkedInAt: null,
  };
  dataStore.memory.tickets.push(ticket);

  // Fire 20 simultaneous scan requests
  const scanPromises = Array.from({ length: 20 }, (_, index) => {
    return dataStore.atomicScanTicket({
      code: ticketCode,
      eventId,
      operator: `Scanner_Gate_${index + 1}`,
      scannerLabel: `Gate ${index + 1}`,
      ip: `192.168.1.${10 + index}`
    });
  });

  const results = await Promise.all(scanPromises);

  const successes = results.filter((r) => r.result === "success");
  const duplicates = results.filter((r) => r.result === "duplicate");
  const invalids = results.filter((r) => r.result === "invalid");
  const voids = results.filter((r) => r.result === "void");

  assert.equal(results.length, 20, "Should have 20 total results");
  assert.equal(successes.length, 1, "Exactly one scan must succeed");
  assert.equal(duplicates.length, 19, "Exactly 19 scans must be flagged duplicate");
  assert.equal(invalids.length, 0, "No scans should be invalid");
  assert.equal(voids.length, 0, "No scans should be void");

  // Verify successful scan payload has attendee details
  const winner = successes[0];
  assert.equal(winner.attendeeName, "Ada Lovelace");
  assert.equal(winner.attendeeEmail, "ada@example.com");
  assert.equal(winner.ticketType, "VIP");

  // Verify duplicate scans reference the usedAt time
  for (const dup of duplicates) {
    assert.equal(dup.attendeeName, "Ada Lovelace");
    assert.ok(dup.usedAt, "Duplicate should contain usedAt timestamp");
  }

  // Verify ticket status in store is now 'used'
  const postTicket = dataStore.memory.tickets.find((t) => t.code === ticketCode);
  assert.equal(postTicket.status, "used");
  assert.ok(postTicket.usedAt);
});

test("Check-in: Unknown code returns invalid", async () => {
  const res = await dataStore.atomicScanTicket({
    code: "PQ-NONEXISTENT999",
    eventId: "ev_test_123"
  });
  assert.equal(res.result, "invalid");
});

test("Check-in: Event mismatch returns invalid", async () => {
  const code = "PQ-MISMATCH" + Date.now();
  dataStore.memory.tickets.push({
    id: "tkt_mismatch",
    _id: "tkt_mismatch",
    code,
    ticketCode: code,
    eventId: "event_AAA",
    holderName: "John Doe",
    holderEmail: "john@example.com",
    status: "valid"
  });

  const res = await dataStore.atomicScanTicket({
    code,
    eventId: "event_BBB" // Scanned on gate for event_BBB
  });

  assert.equal(res.result, "invalid");
});

test("Check-in: Void ticket returns void", async () => {
  const code = "PQ-VOID" + Date.now();
  dataStore.memory.tickets.push({
    id: "tkt_voided",
    _id: "tkt_voided",
    code,
    ticketCode: code,
    eventId: "event_AAA",
    holderName: "Refunded User",
    holderEmail: "refund@example.com",
    status: "void"
  });

  const res = await dataStore.atomicScanTicket({
    code,
    eventId: "event_AAA"
  });

  assert.equal(res.result, "void");
});
