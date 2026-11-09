import assert from "node:assert";
import { netFetch } from "../net-fetch.mjs";

const fail = (cause) => async () => { throw Object.assign(new TypeError("fetch failed"), { cause }); };
await assert.rejects(() => netFetch("https://graph.microsoft.com/v1.0/me", {}, fail({ errors: [{ code: "ECONNREFUSED" }] })),
  /graph\.microsoft\.com: ECONNREFUSED\..*egress allowlist/);
// TLS error: reported, but no allowlist hint
await assert.rejects(() => netFetch("https://x.test/", {}, fail({ code: "DEPTH_ZERO_SELF_SIGNED_CERT" })),
  (e) => /DEPTH_ZERO_SELF_SIGNED_CERT/.test(e.message) && !/allowlist/.test(e.message) && !/auth failure/.test(e.message));
// query string never leaks
await assert.rejects(() => netFetch("https://x.test/p?token=abc", {}, fail({ code: "ECONNREFUSED" })), (e) => !/abc/.test(e.message));
assert.strictEqual(await netFetch("https://x.test/", {}, async () => "res"), "res");
console.log("ok");
