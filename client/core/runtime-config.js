const fallout76 = require("../games/fallout76");

const ENVIRONMENTS = new Set(["development", "test", "production"]);

function parseApiBaseUrl(value, environment) {
  if (!value) return null;
  const url = new URL(value);
  const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (url.protocol !== "https:" && !(environment !== "production" && url.protocol === "http:" && loopback)) {
    throw new Error("FanVault API requires HTTPS; HTTP is allowed only on loopback in development or test.");
  }
  if (url.username || url.password || url.search || url.hash) {
    throw new Error("FanVault API base URL must not contain credentials, query parameters or a fragment.");
  }
  return url.href.replace(/\/+$/, "");
}

function loadRuntimeConfig(env = process.env) {
  const environment = env.FANVAULT_ENV || "development";
  if (!ENVIRONMENTS.has(environment)) {
    throw new Error("FANVAULT_ENV must be development, test or production.");
  }
  const gameId = env.FANVAULT_GAME || "fallout76";
  if (gameId !== fallout76.id) {
    throw new Error("Only the fallout76 game configuration is currently supported.");
  }
  return {
    environment,
    game: fallout76,
    // An address is configuration only: authenticated API transport is not implemented yet.
    apiBaseUrl: parseApiBaseUrl(env.FANVAULT_API_BASE_URL, environment),
    transport: {
      mode: environment === "production" ? "unavailable" : "local-prototype",
      localChatUrl: environment === "production" ? null : "ws://127.0.0.1:3001"
    }
  };
}

module.exports = { loadRuntimeConfig };
