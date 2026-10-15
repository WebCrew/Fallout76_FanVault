const test = require("node:test");
const assert = require("node:assert/strict");
const { loadRuntimeConfig } = require("./runtime-config");

test("development preserves the loopback demo without inventing a deployed API", () => {
  const config = loadRuntimeConfig({});
  assert.equal(config.game.id, "fallout76");
  assert.equal(config.apiBaseUrl, null);
  assert.equal(config.transport.localChatUrl, "ws://127.0.0.1:3001");
});

test("production never enables the unauthenticated prototype, even with an API address", () => {
  for (const apiUrl of [undefined, "https://example.invalid/fanvault/api/v1/"]) {
    const config = loadRuntimeConfig({ FANVAULT_ENV: "production", FANVAULT_API_BASE_URL: apiUrl });
    assert.equal(config.transport.mode, "unavailable");
    assert.equal(config.transport.localChatUrl, null);
  }
});

test("local HTTP is limited to development and test", () => {
  for (const environment of ["development", "test"]) {
    assert.equal(loadRuntimeConfig({ FANVAULT_ENV: environment, FANVAULT_API_BASE_URL: "http://127.0.0.1:8080/api/" }).apiBaseUrl, "http://127.0.0.1:8080/api");
    assert.throws(() => loadRuntimeConfig({ FANVAULT_ENV: environment, FANVAULT_API_BASE_URL: "http://example.invalid/api" }));
  }
  assert.throws(() => loadRuntimeConfig({ FANVAULT_ENV: "production", FANVAULT_API_BASE_URL: "http://127.0.0.1/api" }));
});

test("reject URLs that could disclose credentials or target unsupported schemes", () => {
  for (const url of ["https://user:secret@example.invalid", "https://example.invalid/?token=secret", "https://example.invalid/#secret", "file:///tmp/api", "ws://127.0.0.1", "not a URL"]) {
    assert.throws(() => loadRuntimeConfig({ FANVAULT_API_BASE_URL: url }));
  }
});

test("unknown environments and games fail instead of silently selecting the demo", () => {
  assert.throws(() => loadRuntimeConfig({ FANVAULT_ENV: "prod" }));
  assert.throws(() => loadRuntimeConfig({ FANVAULT_GAME: "another-game" }));
});
