import assert from "node:assert";
import { graphUrl } from "../graph-url.mjs";
import { readJson } from "../net-fetch.mjs";

const B = "https://graph.microsoft.com/v1.0";
assert.strictEqual(graphUrl(B, "/me"), `${B}/me`);
assert.strictEqual(graphUrl(B, `${B}/me/messages?$skip=10`), `${B}/me/messages?$skip=10`);
assert.throws(() => graphUrl(B, "https://evil.test/x"), /non-Graph/);
assert.throws(() => graphUrl(B, "http://graph.microsoft.com/v1.0/me"), /non-Graph/); // scheme downgrade
assert.throws(() => graphUrl(B, "https://graph.microsoft.com.evil.test/x"), /non-Graph/);

assert.deepStrictEqual(await readJson(new Response('{"a":1}')), { a: 1 });
const html = Object.defineProperty(new Response("<html>", { status: 403 }), "url", { value: "https://graph.microsoft.com/x" });
await assert.rejects(() => readJson(html), /non-JSON response \(HTTP 403\) from graph\.microsoft\.com/);
console.log("ok");
