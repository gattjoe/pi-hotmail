// ponytail: plain .mjs (not .ts) so this one function is testable with plain `node`, no build step
export function isExpired(expiresAt, now = Date.now(), bufferMs = 60_000) {
  return now >= expiresAt - bufferMs;
}
