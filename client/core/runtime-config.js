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
  const apiBaseUrl = parseApiBaseUrl(env.FANVAULT_API_BASE_URL, environment);
  if (environment === "production" && apiBaseUrl && new URL(apiBaseUrl).origin !== "https://net-twin.de") {
    throw new Error("Production FanVault sign-in requires net-twin.de.");
  }
  const loginEnabled = Boolean(apiBaseUrl && environment !== "development");
  const demo = environment !== "production" && !loginEnabled;
  return {
    environment,
    game: fallout76,
    apiBaseUrl,
    loginEnabled,
    transport: {
      mode: demo ? "local-prototype" : "unavailable",
      localChatUrl: demo ? "ws://127.0.0.1:3001" : null
    }
  };
}

module.exports = { loadRuntimeConfig };
