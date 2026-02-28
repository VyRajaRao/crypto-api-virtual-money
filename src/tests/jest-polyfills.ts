// Polyfill fetch API globals for Jest/jsdom environment.
// Node 18+ has native fetch, but jest-environment-jsdom may not expose them.
if (typeof global.Response === 'undefined') {
  const g = globalThis as Record<string, unknown>;
  Object.assign(global, {
    fetch: g['fetch'],
    Request: g['Request'],
    Response: g['Response'],
    Headers: g['Headers'],
  });
}
