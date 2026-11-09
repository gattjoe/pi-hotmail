import assert from "node:assert";
import { isExpired } from "../expiry.mjs";

assert.strictEqual(isExpired(Date.now() + 120_000), false, "token valid for 2 more minutes should not be expired");
assert.strictEqual(isExpired(Date.now() + 30_000), true, "token inside the 60s refresh buffer should be treated as expired");
assert.strictEqual(isExpired(Date.now() - 1000), true, "already-expired token should be expired");

console.log("ok");
