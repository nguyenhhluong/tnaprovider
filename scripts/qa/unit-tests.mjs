#!/usr/bin/env node

// ── Inline validation helpers (mirrors server/middleware/validate.js) ──
function isPresent(value) {
  if (value === null || value === undefined) return false;
  if (typeof value === "string" && value.trim() === "") return false;
  return true;
}

const VALID_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VALID_PHONE = /^[\d\s+()-]{8,20}$/;
const VALID_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidEmail(value) {
  return typeof value === "string" && VALID_EMAIL.test(value);
}

function isValidPhone(value) {
  return typeof value === "string" && VALID_PHONE.test(value);
}

function isValidNumber(value, min, max) {
  if (typeof value !== "number" || !isFinite(value)) return false;
  if (min !== undefined && value < min) return false;
  if (max !== undefined && value > max) return false;
  return true;
}

function isInteger(value) {
  return typeof value === "number" && Number.isInteger(value);
}

function isValidEnum(value, allowed) {
  return allowed.includes(value);
}

function isValidUUID(value) {
  return typeof value === "string" && VALID_UUID.test(value);
}

let passed = 0;
let failed = 0;

function test(label, condition) {
  if (condition) {
    console.log(`  PASS  ${label}`);
    passed++;
  } else {
    console.log(`  FAIL  ${label}`);
    failed++;
  }
}

// ── Test 1: Validation of 0 and false ──
console.log("\n[Test 1] Validation of 0 and false");
test("isPresent(0) is true", isPresent(0) === true);
test("isPresent(false) is true", isPresent(false) === true);

// ── Test 2: Validation of empty string, null, undefined ──
console.log("\n[Test 2] Validation of empty / null / undefined");
test("isPresent(null) is false", isPresent(null) === false);
test("isPresent(undefined) is false", isPresent(undefined) === false);
test('isPresent("") is false', isPresent("") === false);
test('isPresent("  ") is false', isPresent("  ") === false);
test('isPresent("hello") is true', isPresent("hello") === true);
test("isPresent([]) is true", isPresent([]) === true);
test("isPresent({}) is true", isPresent({}) === true);

// ── Test 3: Email validation ──
console.log("\n[Test 3] Email validation");
test('Valid: user@example.com', isValidEmail("user@example.com") === true);
test('Valid: a@b.co', isValidEmail("a@b.co") === true);
test('Valid: name+tag@domain.com', isValidEmail("name+tag@domain.com") === true);
test('Invalid: no-at', isValidEmail("no-at") === false);
test('Invalid: @missing.com', isValidEmail("@missing.com") === false);
test('Invalid: missing@domain', isValidEmail("missing@domain") === false);
test('Invalid: empty string', isValidEmail("") === false);
test('Invalid: null', isValidEmail(null) === false);

// ── Test 4: Phone validation ──
console.log("\n[Test 4] Phone validation");
test('Valid: 0412345678', isValidPhone("0412345678") === true);
test('Valid: +61 2 1234 5678', isValidPhone("+61 2 1234 5678") === true);
test('Valid: (02) 9999 8888', isValidPhone("(02) 9999 8888") === true);
test('Invalid: too short (123)', isValidPhone("123") === false);
test('Invalid: empty string', isValidPhone("") === false);
test('Invalid: null', isValidPhone(null) === false);

// ── Test 5: Number validation (min, max) ──
console.log("\n[Test 5] Number validation (min / max)");
test("5 in [0, 10]", isValidNumber(5, 0, 10) === true);
test("0 with min 0", isValidNumber(0, 0) === true);
test("-1 with min 0", isValidNumber(-1, 0) === false);
test("11 with max 10", isValidNumber(11, undefined, 10) === false);
test("10 with max 10", isValidNumber(10, undefined, 10) === true);
test('"abc" is not a number', isValidNumber("abc") === false);
test("null is not a number", isValidNumber(null) === false);
test("NaN is not a number", isValidNumber(NaN) === false);
test("Infinity is not a number", isValidNumber(Infinity) === false);

// ── Test 6: Integer validation ──
console.log("\n[Test 6] Integer validation");
test("5 is an integer", isInteger(5) === true);
test("0 is an integer", isInteger(0) === true);
test("-3 is an integer", isInteger(-3) === true);
test("3.14 is not an integer", isInteger(3.14) === false);
test('"5" is not an integer', isInteger("5") === false);
test("NaN is not an integer", isInteger(NaN) === false);

// ── Test 7: Enum validation ──
console.log("\n[Test 7] Enum validation");
test("admin in valid roles", isValidEnum("admin", ["owner", "admin", "manager", "worker", "client"]) === true);
test("superadmin not in roles", isValidEnum("superadmin", ["owner", "admin", "manager", "worker", "client"]) === false);
test("low in priorities", isValidEnum("low", ["low", "medium", "high", "critical"]) === true);
test("urgent not in priorities", isValidEnum("urgent", ["low", "medium", "high", "critical"]) === false);

// ── Test 8: UUID validation ──
console.log("\n[Test 8] UUID validation");
test("Valid v4 UUID", isValidUUID("550e8400-e29b-41d4-a716-446655440000") === true);
test("Valid uppercase UUID", isValidUUID("550E8400-E29B-41D4-A716-446655440000") === true);
test("Invalid: no dashes", isValidUUID("550e8400e29b41d4a716446655440000") === false);
test("Invalid: too short", isValidUUID("550e8400") === false);
test("Invalid: empty string", isValidUUID("") === false);
test("Invalid: null", isValidUUID(null) === false);

// ── Summary ──
console.log(`\n${failed > 0 ? "FAIL" : "PASS"} \u2014 ${passed} passed, ${failed} failed\n`);
process.exit(failed > 0 ? 1 : 0);
