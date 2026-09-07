// ponytail: plain .mjs so this is testable with plain `node`, no build step
//
// Graph message ids are 100+ char opaque strings that differ only in a
// few trailing characters between adjacent emails — easy for an LLM to
// transpose when generating a tool call. Swap them for short session-scoped
// refs ("1", "2", ...) so there's far less room to pick the wrong one.
export function createRefMap() {
  let counter = 0;
  const refToId = new Map();

  return {
    // Register an id, return the short ref standing in for it.
    add(id) {
      const ref = String(++counter);
      refToId.set(ref, id);
      return ref;
    },
    // A ref resolves to its id; anything else (a raw id, e.g. from before
    // this session or copied by hand) passes through unchanged.
    resolve(idOrRef) {
      return refToId.get(idOrRef) ?? idOrRef;
    },
  };
}
