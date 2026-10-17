import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PRODUCTION_ORIGIN, inviteOrigin, shareUrl } from "./share";

describe("inviteOrigin", () => {
  it("keeps the production host", () => {
    assert.equal(inviteOrigin("https://blinqplay.vercel.app"), PRODUCTION_ORIGIN);
  });

  it("rewrites localhost to production", () => {
    assert.equal(inviteOrigin("http://localhost:3000"), PRODUCTION_ORIGIN);
    assert.equal(inviteOrigin("http://127.0.0.1:3000"), PRODUCTION_ORIGIN);
    assert.equal(inviteOrigin("http://[::1]:3000"), PRODUCTION_ORIGIN);
  });

  it("rewrites Vercel preview hosts to production", () => {
    assert.equal(inviteOrigin("https://blinq-git-feat-qr-user.vercel.app"), PRODUCTION_ORIGIN);
  });

  it("keeps a custom production domain", () => {
    assert.equal(inviteOrigin("https://play.blinq.example"), "https://play.blinq.example");
  });

  it("falls back to production for an invalid origin", () => {
    assert.equal(inviteOrigin("not a url"), PRODUCTION_ORIGIN);
  });
});

describe("shareUrl", () => {
  it("builds a join path on the invite origin", () => {
    assert.equal(shareUrl("AB12CD", "http://localhost:3000"), `${PRODUCTION_ORIGIN}/join/AB12CD`);
    assert.equal(shareUrl("AB12CD", "https://blinqplay.vercel.app"), `${PRODUCTION_ORIGIN}/join/AB12CD`);
  });
});
