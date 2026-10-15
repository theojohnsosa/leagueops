import assert from "node:assert/strict";
import { validateRegistration } from "./rulesEngine.js";

// ---------- tiny test runner ----------
let passed = 0;
let failed = 0;
function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.log(`  ✗ ${name}\n      ${err.message}`);
    failed++;
  }
}

// ---------- helpers that build fake data ----------
const NOW = new Date("2026-11-10T12:00:00Z");

function makeEvent(overrides = {}) {
  return {
    registrationOpenDate: "2026-11-01T00:00:00Z",
    registrationClosedDate: "2026-11-20T00:00:00Z",
    maxSlots: 8,
    playersPerTeam: 3,
    ...overrides,
  };
}

function makeReg(teamName, studentIds, status = "pending") {
  return {
    teamName,
    status,
    playerDetails: studentIds.map((studentId) => ({ studentId })),
  };
}

function codesOf(result) {
  return result.errors.map((e) => e.code);
}

// ---------- tests ----------
console.log("Rules engine");

test("a valid registration passes", () => {
  const result = validateRegistration(
    makeEvent(),
    makeReg("Alpha", ["1", "2", "3"]),
    [],
    NOW,
  );
  assert.equal(result.ok, true);
  assert.deepEqual(result.errors, []);
});

test("rejects before the window opens", () => {
  const event = makeEvent({ registrationOpenDate: "2026-11-15T00:00:00Z" });
  const result = validateRegistration(
    event,
    makeReg("Alpha", ["1", "2", "3"]),
    [],
    NOW,
  );
  assert.deepEqual(codesOf(result), ["REGISTRATION_CLOSED"]);
});

test("rejects after the window closes", () => {
  const event = makeEvent({ registrationClosedDate: "2026-11-05T00:00:00Z" });
  const result = validateRegistration(
    event,
    makeReg("Alpha", ["1", "2", "3"]),
    [],
    NOW,
  );
  assert.deepEqual(codesOf(result), ["REGISTRATION_CLOSED"]);
});

test("rejects when all slots are taken", () => {
  const event = makeEvent({ maxSlots: 2 });
  const existing = [
    makeReg("A", ["10", "11", "12"], "accepted"),
    makeReg("B", ["20", "21", "22"], "accepted"),
  ];
  const result = validateRegistration(
    event,
    makeReg("Alpha", ["1", "2", "3"]),
    existing,
    NOW,
  );
  assert.deepEqual(codesOf(result), ["SLOTS_FULL"]);
});

test("pending teams do not use up slots", () => {
  const event = makeEvent({ maxSlots: 1 });
  const existing = [makeReg("A", ["10", "11", "12"], "pending")];
  const result = validateRegistration(
    event,
    makeReg("Alpha", ["1", "2", "3"]),
    existing,
    NOW,
  );
  assert.equal(result.ok, true);
});

test("rejects a duplicate team name (ignores case and spaces)", () => {
  const existing = [makeReg("Team  Alpha", ["10", "11", "12"])];
  const result = validateRegistration(
    makeEvent(),
    makeReg("  team alpha ", ["1", "2", "3"]),
    existing,
    NOW,
  );
  assert.deepEqual(codesOf(result), ["DUPLICATE_TEAM_NAME"]);
});

test("a rejected team does not block its name", () => {
  const existing = [makeReg("Alpha", ["10", "11", "12"], "rejected")];
  const result = validateRegistration(
    makeEvent(),
    makeReg("Alpha", ["1", "2", "3"]),
    existing,
    NOW,
  );
  assert.equal(result.ok, true);
});

test("rejects the same roster in a different order", () => {
  const existing = [makeReg("Beta", ["3", "1", "2"])];
  const result = validateRegistration(
    makeEvent(),
    makeReg("Alpha", ["1", "2", "3"]),
    existing,
    NOW,
  );
  assert.ok(codesOf(result).includes("DUPLICATE_ROSTER"));
});

test("rejects a roster that is too small", () => {
  const result = validateRegistration(
    makeEvent(),
    makeReg("Alpha", ["1", "2"]),
    [],
    NOW,
  );
  assert.deepEqual(codesOf(result), ["INVALID_ROSTER_SIZE"]);
});

test("rejects a roster that is too big", () => {
  const result = validateRegistration(
    makeEvent(),
    makeReg("Alpha", ["1", "2", "3", "4"]),
    [],
    NOW,
  );
  assert.deepEqual(codesOf(result), ["INVALID_ROSTER_SIZE"]);
});

test("rejects the same player listed twice", () => {
  const result = validateRegistration(
    makeEvent(),
    makeReg("Alpha", ["1", "1", "2"]),
    [],
    NOW,
  );
  assert.deepEqual(codesOf(result), ["ROSTER_HAS_DUPLICATES"]);
});

test("rejects a player who is already on an accepted team", () => {
  const existing = [makeReg("Beta", ["3", "8", "9"], "accepted")];
  const result = validateRegistration(
    makeEvent(),
    makeReg("Alpha", ["1", "2", "3"]),
    existing,
    NOW,
  );
  assert.deepEqual(codesOf(result), ["PLAYER_ALREADY_REGISTERED"]);
});

test("a player on a pending team is still allowed", () => {
  const existing = [makeReg("Beta", ["3", "8", "9"], "pending")];
  const result = validateRegistration(
    makeEvent(),
    makeReg("Alpha", ["1", "2", "3"]),
    existing,
    NOW,
  );
  assert.equal(result.ok, true);
});

test("reports several problems at once", () => {
  const event = makeEvent({ registrationClosedDate: "2026-11-05T00:00:00Z" });
  const result = validateRegistration(
    event,
    makeReg("Alpha", ["1", "2"]),
    [],
    NOW,
  );
  assert.deepEqual(codesOf(result), [
    "REGISTRATION_CLOSED",
    "INVALID_ROSTER_SIZE",
  ]);
});
test("rejects an empty or blank team name", () => {
  for (const name of ["", "   ", undefined]) {
    const result = validateRegistration(
      makeEvent(),
      makeReg(name, ["1", "2", "3"]),
      [],
      NOW,
    );
    assert.equal(
      result.ok,
      false,
      `name ${JSON.stringify(name)} should be rejected`,
    );
    assert.deepEqual(codesOf(result), ["MISSING_TEAM_NAME"]);
  }
});

test("a blank name is reported as missing, not as a duplicate", () => {
  const existing = [makeReg("", ["10", "11", "12"])];
  const result = validateRegistration(
    makeEvent(),
    makeReg("", ["1", "2", "3"]),
    existing,
    NOW,
  );
  assert.deepEqual(codesOf(result), ["MISSING_TEAM_NAME"]);
});

test("a blank student ID is called out in the roster error", () => {
  const result = validateRegistration(
    makeEvent(),
    makeReg("Alpha", ["1", "2", ""]),
    [],
    NOW,
  );
  assert.deepEqual(codesOf(result), ["INVALID_ROSTER_SIZE"]);
  assert.ok(result.errors[0].message.includes("no student ID"));
});

test("rejects a full roster that includes a blank student ID", () => {
  const result = validateRegistration(
    makeEvent(),
    makeReg("Alpha", ["1", "2", "3", ""]),
    [],
    NOW,
  );
  assert.deepEqual(codesOf(result), ["INVALID_ROSTER_SIZE"]);
});
// ---------- summary ----------
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
