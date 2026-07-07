import { resolve, sep } from "node:path";

// ponytail: plain .mjs so this guard is testable with plain `node`, no build step
export function resolveWithinDir(baseDir, destPath) {
  const resolved = resolve(baseDir, destPath);
  if (resolved !== baseDir && !resolved.startsWith(baseDir + sep)) {
    throw new Error(`destPath must stay within ${baseDir}`);
  }
  return resolved;
}
