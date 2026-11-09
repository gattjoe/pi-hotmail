// Node's fetch throws a bare "fetch failed"; the real reason (ECONNREFUSED, proxy 403, DNS) is in err.cause.
// Rethrow with it so the model/user can tell a blocked network from an auth problem.
export async function netFetch(url, init, fetchImpl = fetch) {
  try {
    return await fetchImpl(url, init);
  } catch (e) {
    const c = e?.cause;
    const detail = c?.errors?.[0]?.code ?? c?.code ?? c?.message ?? e?.message;
    const host = new URL(url).host;
    throw new Error(`Network error reaching ${host}: ${detail}. Check egress allowlist/proxy; this is not an auth failure.`, { cause: e });
  }
}
