import assert from "node:assert/strict";
import test from "node:test";
import { createAppSchema, createFeatureSchema, isSafeAppIconDataUrl } from "./app";
import { getGooglePlayIcon } from "../services/google-play";

test("app metadata accepts nullable legacy fields and validates package IDs and URLs", () => {
  const parsed = createAppSchema.parse({
    name: "Example",
    packageName: "com.example.mobile_app",
    appUrl: "https://example.com/app",
    appIconData: null,
    appIconUrl: "https://play-lh.googleusercontent.com/icon",
  });
  assert.equal(parsed.packageName, "com.example.mobile_app");
  assert.equal(parsed.appIconData, null);
  assert.equal(parsed.appIconUrl, "https://play-lh.googleusercontent.com/icon");
  assert.throws(() => createAppSchema.parse({ name: "Example", packageName: "example" }));
  assert.throws(() => createAppSchema.parse({ name: "Example", appUrl: "javascript:alert(1)" }));
  assert.throws(() => createAppSchema.parse({ name: "Example", appIconUrl: "https://example.com/icon.png" }));
});

test("app icon data URLs are limited to correctly tagged PNG, JPEG, and WebP payloads", () => {
  const png = `data:image/png;base64,${Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).toString("base64")}`;
  assert.equal(isSafeAppIconDataUrl(png), true);
  assert.equal(isSafeAppIconDataUrl("data:image/svg+xml;base64,PHN2Zz4="), false);
  assert.equal(isSafeAppIconDataUrl(`data:image/png;base64,${Buffer.alloc(512 * 1024 + 1).toString("base64")}`), false);
});

test("feature event names preserve exact case and configured order", () => {
  const events = ["openHome", "OpenHome", " openHome "];
  assert.deepEqual(createFeatureSchema.parse({ name: "Journey", events }).events, events);
  assert.throws(() => createFeatureSchema.parse({ name: "Journey", events: ["openHome", "openHome"] }));
});

test("Google Play icon lookup extracts and verifies listing metadata", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input) => {
    const url = new URL(String(input));
    if (url.hostname === "play.google.com") {
      return new Response('<meta content="https://play-lh.googleusercontent.com/icon&amp;size=96" property="og:image">', {
        status: 200,
        headers: { "content-type": "text/html", "content-length": "100" },
      });
    }
    return new Response(new Uint8Array([1]), { status: 206, headers: { "content-type": "image/png" } });
  };
  try {
    assert.deepEqual(await getGooglePlayIcon("https://play.google.com/store/apps/details?id=com.example.app"), {
      packageName: "com.example.app",
      appIconUrl: "https://play-lh.googleusercontent.com/icon&size=96",
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Google Play icon lookup rejects invalid listings and inaccessible image URLs", async () => {
  const originalFetch = globalThis.fetch;
  let fetchCount = 0;
  globalThis.fetch = async (input) => {
    fetchCount += 1;
    const url = new URL(String(input));
    return url.hostname === "play.google.com"
      ? new Response('<meta property="og:image" content="https://play-lh.googleusercontent.com/icon.png">', { status: 200, headers: { "content-type": "text/html" } })
      : new Response("not an image", { status: 200, headers: { "content-type": "text/html" } });
  };
  try {
    await assert.rejects(getGooglePlayIcon("https://example.com/store/apps/details?id=com.example.app"), /Google Play Store app listing URL/);
    await assert.rejects(getGooglePlayIcon("https://play.google.com/store/apps/details?id=com.example.app"), /icon could not be loaded/);
    assert.equal(fetchCount, 2);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
