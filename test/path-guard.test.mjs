import assert from "node:assert";
import { resolveWithinDir } from "../path-guard.mjs";

const base = "/tmp/safe-dir";

assert.strictEqual(resolveWithinDir(base, "file.pdf"), "/tmp/safe-dir/file.pdf", "plain relative path stays inside base");
assert.strictEqual(resolveWithinDir(base, "sub/file.pdf"), "/tmp/safe-dir/sub/file.pdf", "nested relative path stays inside base");
assert.throws(() => resolveWithinDir(base, "../escape.txt"), /must stay within/, "parent traversal is rejected");
assert.throws(() => resolveWithinDir(base, "/etc/passwd"), /must stay within/, "absolute path outside base is rejected");

console.log("ok");
