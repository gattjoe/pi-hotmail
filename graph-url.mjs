// The bearer token is attached to whatever URL we fetch, so only ever send it to Graph.
export function graphUrl(base, path) {
  const url = path.startsWith("http") ? path : `${base}${path}`;
  if (new URL(url).origin !== new URL(base).origin) {
    throw new Error(`Refusing to send credentials to non-Graph URL: ${new URL(url).origin}`);
  }
  return url;
}
