// Node's fetch throws a bare "fetch failed"; the real reason (ECONNREFUSED, proxy 403, DNS) is in err.cause.
// Rethrow with it so the model/user can tell a blocked network from an auth problem.
const BLOCKED = new Set(["ECONNREFUSED", "ENETUNREACH", "ENOTFOUND", "EHOSTUNREACH", "ETIMEDOUT"]);

export async function netFetch(url, init, fetchImpl = fetch) {
  try {
    return await fetchImpl(url, init);
  } catch (e) {
    const c = e?.cause;
    const code = c?.errors?.[0]?.code ?? c?.code;
    const detail = code ?? c?.message ?? e?.message;
    const hint = BLOCKED.has(code) ? " Check the egress allowlist/proxy." : "";
    throw new Error(`Network error reaching ${new URL(url).host}: ${detail}.${hint}`, { cause: e });
  }
}

// A proxy/captive-portal error page is HTML, not JSON; say so instead of a bare JSON SyntaxError.
export async function readJson(res) {
  try {
    return await res.json();
  } catch {
    throw new Error(`Unexpected non-JSON response (HTTP ${res.status}) from ${new URL(res.url).host}`);
  }
}
