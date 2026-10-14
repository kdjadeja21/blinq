import assert from "node:assert/strict";
import { test } from "node:test";
import { GUEST_MAX_LEVEL, isGuestLocked } from "./guest";

test("guests can play up to the cap and are locked after it", () => {
  assert.equal(isGuestLocked(true, GUEST_MAX_LEVEL), false);
  assert.equal(isGuestLocked(true, GUEST_MAX_LEVEL + 1), true);
});

test("signed-in players are never locked", () => {
  assert.equal(isGuestLocked(false, 50), false);
});
