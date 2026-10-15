import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { stickySide } from "./stickySide";

describe("stickySide", () => {
  it("is hidden while the row is fully visible", () => {
    assert.equal(stickySide(1, 200, 100), null);
  });

  it("pins to the top when the row left above the viewport", () => {
    assert.equal(stickySide(0, 40, 100), "top");
    assert.equal(stickySide(0.5, 80, 100), "top");
  });

  it("pins to the bottom when the row is below the viewport", () => {
    assert.equal(stickySide(0, 600, 100), "bottom");
    assert.equal(stickySide(0.5, 400, 100), "bottom");
  });
});
