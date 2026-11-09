import assert from "node:assert";
import { createRefMap } from "../refs.mjs";

const refs = createRefMap();

const ref1 = refs.add("AQMk...longid1");
const ref2 = refs.add("AQMk...longid2");
assert.notStrictEqual(ref1, ref2, "each add gets a distinct ref");
assert.strictEqual(refs.resolve(ref1), "AQMk...longid1", "ref resolves back to its id");
assert.strictEqual(refs.resolve(ref2), "AQMk...longid2", "second ref resolves to second id");
assert.strictEqual(refs.resolve("AQMk...unseen"), "AQMk...unseen", "unknown input passes through as a literal id");

const fresh = createRefMap();
const first = fresh.add("a");
assert.strictEqual(first, "1", "counter starts at 1 for a new map");

console.log("ok");
