import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isMobileDevice, manualInstallHint, type DeviceProbe } from "./install";

const desktop: DeviceProbe = {
  userAgent:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
  maxTouchPoints: 0,
  pointerCoarse: false,
  maxWidth768: false,
};

describe("isMobileDevice", () => {
  it("is false on a laptop Chrome session", () => {
    assert.equal(isMobileDevice(desktop), false);
  });

  it("is false on a narrow laptop window with a fine pointer", () => {
    assert.equal(isMobileDevice({ ...desktop, maxWidth768: true }), false);
  });

  it("is true for iPhone", () => {
    assert.equal(
      isMobileDevice({
        userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
        maxTouchPoints: 5,
        pointerCoarse: true,
        maxWidth768: true,
      }),
      true,
    );
  });

  it("is true for Android phones", () => {
    assert.equal(
      isMobileDevice({
        userAgent: "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Mobile Safari/537.36",
        maxTouchPoints: 5,
        pointerCoarse: true,
        maxWidth768: true,
      }),
      true,
    );
  });

  it("is true for iPadOS desktop UA with multi-touch", () => {
    assert.equal(
      isMobileDevice({
        userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15",
        maxTouchPoints: 5,
        pointerCoarse: true,
        maxWidth768: false,
      }),
      true,
    );
  });

  it("is true for a coarse pointer on a narrow viewport without a phone UA", () => {
    assert.equal(
      isMobileDevice({
        userAgent: "Mozilla/5.0 (Linux; Android 13; SM-X810) AppleWebKit/537.36 Safari/537.36",
        maxTouchPoints: 5,
        pointerCoarse: true,
        maxWidth768: true,
      }),
      true,
    );
  });
});

describe("manualInstallHint", () => {
  it("names Chrome's install menu", () => {
    assert.match(manualInstallHint(desktop.userAgent), /Chrome menu/);
  });

  it("names Edge's install menu", () => {
    assert.match(
      manualInstallHint(`${desktop.userAgent} Edg/129.0.0.0`),
      /browser menu/,
    );
  });

  it("gives a Safari dock / home-screen hint", () => {
    assert.match(
      manualInstallHint("Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15"),
      /Add to Dock or Home Screen/,
    );
  });

  it("falls back for other browsers", () => {
    assert.match(manualInstallHint("Mozilla/5.0 Firefox/131.0"), /Chrome or Edge/);
  });
});
