// Pre-resolve Expo winter runtime globals to avoid lazy-loading issues in jest 30.
// The lazy getters in runtime.native.ts trigger "outside of test code scope" errors
// when the globals are accessed after leaveTestCode() is called (e.g. in afterAll).
// Pre-setting them ensures the lazy getter never fires during test teardown.

if (!(globalThis as Record<string, unknown>).__ExpoImportMetaRegistry) {
  (globalThis as Record<string, unknown>).__ExpoImportMetaRegistry = { url: 'http://localhost' };
}

// Pre-set structuredClone if not already available
if (!globalThis.structuredClone) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  globalThis.structuredClone = require('@ungap/structured-clone').default as typeof structuredClone;
}
