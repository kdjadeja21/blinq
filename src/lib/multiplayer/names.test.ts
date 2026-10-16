import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { NAME_MAX } from "./config";
import { defaultPlayerName, type PlayerNameSource } from "./names";

describe("defaultPlayerName", () => {
  it("returns an empty string for a guest", () => {
    assert.equal(defaultPlayerName(null), "");
  });

  it("uses the username when it fits", () => {
    assert.equal(defaultPlayerName({ username: "ada" }), "ada");
  });

  it("ignores legacy given names on the user object", () => {
    const user = { username: "ada_lovelace", firstName: "Ada", lastName: "Lovelace" };
    assert.equal(defaultPlayerName(user as PlayerNameSource), "ada_lovelace");
  });

  it("returns an empty string for a reserved username", () => {
    assert.equal(defaultPlayerName({ username: "Botty" }), "");
  });

  it("returns an empty string when the username is too short", () => {
    assert.equal(defaultPlayerName({ username: "x" }), "");
  });

  it("returns an empty string when the username is too long", () => {
    assert.equal(defaultPlayerName({ username: "a".repeat(NAME_MAX + 1) }), "");
  });

  it("returns an empty string when the username is missing", () => {
    assert.equal(defaultPlayerName({}), "");
  });
});
