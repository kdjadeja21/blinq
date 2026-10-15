import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { defaultPlayerName } from "./names";

describe("defaultPlayerName", () => {
  it("returns an empty string for a guest", () => {
    assert.equal(defaultPlayerName(null), "");
  });

  it("uses the first and last name when they fit", () => {
    assert.equal(defaultPlayerName({ firstName: "Ada", lastName: "Lovelace" }), "Ada Lovelace");
  });

  it("falls back to the first name when the full name is too long", () => {
    assert.equal(
      defaultPlayerName({ firstName: "Christopher", lastName: "Alexander", username: "chris" }),
      "Christopher",
    );
  });

  it("falls back to the username when the given names do not fit", () => {
    assert.equal(
      defaultPlayerName({ firstName: "A", lastName: "Verylonglastname", username: "ada" }),
      "ada",
    );
  });

  it("skips a reserved or blocked candidate", () => {
    assert.equal(defaultPlayerName({ firstName: "Botty", username: "Ada" }), "Ada");
  });

  it("returns an empty string when nothing fits", () => {
    assert.equal(defaultPlayerName({ firstName: "A", username: "x" }), "");
  });
});
