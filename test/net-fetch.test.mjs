import assert from "node:assert";
import { netFetch } from "../net-fetch.mjs";

const failing = async () => { throw Object.assign(new TypeError("fetch failed"), { cause: { errors: [{ code: "ECONNREFUSED" }] } }); };
await assert.rejects(() => netFetch("https://graph.microsoft.com/v1.0/me", {}, failing), /graph\.microsoft\.com: ECONNREFUSED/);
const ok = async () => "res";
assert.strictEqual(await netFetch("https://x.test/", {}, ok), "res");
console.log("ok");
