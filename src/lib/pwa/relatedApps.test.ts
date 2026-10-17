import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { WEB_APP_MANIFEST_URL, relatedPwaIsInstalled } from "./relatedApps";

const PRODUCTION_ORIGIN = new URL(WEB_APP_MANIFEST_URL).origin;

describe("relatedPwaIsInstalled", () => {
  it("is false when Chrome reports nothing", () => {
    assert.equal(relatedPwaIsInstalled([]), false);
  });

  it("is false for a Play Store app that is not this PWA", () => {
    assert.equal(relatedPwaIsInstalled([{ platform: "play", id: "com.example.blinq" }]), false);
  });

  it("is true for this site's webapp manifest", () => {
    assert.equal(relatedPwaIsInstalled([{ platform: "webapp", url: WEB_APP_MANIFEST_URL }]), true);
  });

  it("is true when Chrome omits the manifest URL for a webapp", () => {
    assert.equal(relatedPwaIsInstalled([{ platform: "webapp" }]), true);
  });

  it("is false for a webapp on another origin", () => {
    assert.equal(
      relatedPwaIsInstalled([{ platform: "webapp", url: "https://other.example/manifest.webmanifest" }]),
      false,
    );
  });

  it("accepts a same-origin related webapp URL", () => {
    assert.equal(relatedPwaIsInstalled([{ platform: "webapp", url: `${PRODUCTION_ORIGIN}/` }]), true);
  });
});
