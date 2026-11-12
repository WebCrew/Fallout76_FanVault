const { setTimeout: wait } = require("node:timers/promises");

const tokenPattern = /^[A-Za-z0-9_-]{43}$/;

function createNetTwinLogin({ baseUrl, openBrowser, onChange = () => {}, request = fetch }) {
  const entry = baseUrl ? new URL("index.php", baseUrl.replace(/\/+$/, "") + "/") : null;
  let state = { phase: entry ? "idle" : "unavailable" };
  let pending = null;
  let access = null;
  let signingOut = false;

  function publish(next) {
    state = next;
    onChange(next);
    return next;
  }
  function route(action) {
    const url = new URL(entry);
    url.searchParams.set("action", action);
    return url.href;
  }
  async function api(action, { body, token, signal } = {}) {
    const headers = { Accept: "application/json" };
    if (token) headers.Authorization = "Bearer " + token;
    if (body) headers["Content-Type"] = "application/json";
    const timeout = AbortSignal.timeout(8000);
    const response = await request(route(action), {
      method: body ? "POST" : "GET", headers, body: body ? JSON.stringify(body) : undefined,
      redirect: "error", cache: "no-store", signal: signal ? AbortSignal.any([signal, timeout]) : timeout
    });
    if (response.status === 401) return { error: "unauthorized" };
    if (response.status === 429) return { error: "slow_down", interval: 10 };
    if (response.status === 404 && action === "member-search") return { error: "search_unavailable" };
    if (response.status === 404 && action === "our-guild") return { error: "guild_unavailable" };
    if (!(response.headers.get("content-type") || "").startsWith("application/json")) throw new Error("Invalid API response");
    const result = await response.json();
    if (!result || typeof result !== "object" || (!response.ok && typeof result.error !== "string")) {
      throw new Error("Invalid API response");
    }
    return result;
  }
  async function poll(flow, task) {
    const { signal } = task;
    const deadline = Date.now() + flow.expires_in * 1000;
    let interval = flow.interval;
    try {
      while (Date.now() < deadline && !signal.aborted) {
        await wait(Math.min(interval * 1000, Math.max(0, deadline - Date.now())), undefined, { signal });
        if (Date.now() >= deadline) break;
        const result = await api("exchange", { body: { device_code: flow.device_code }, signal });
        if (signal.aborted) return;
        if (result.error === "authorization_pending") continue;
        if (result.error === "slow_down") {
          interval = Math.min(30, Math.max(interval + 5, Number(result.interval) || 0));
          continue;
        }
        if (result.error === "access_denied" || result.error === "expired_token") {
          publish({ phase: "error", error: result.error });
          return;
        }
        if (result.token_type !== "Bearer" || typeof result.access_token !== "string"
            || !tokenPattern.test(result.access_token)) throw new Error("Invalid session");
        const profile = await api("me", { token: result.access_token, signal });
        if (signal.aborted) return;
        const user = publicProfile(profile);
        access = result.access_token;
        publish({ phase: "authenticated", user });
        return;
      }
      if (!signal.aborted) publish({ phase: "error", error: "expired_token" });
    } catch {
      if (!signal.aborted) publish({ phase: "error", error: "service_unavailable" });
    } finally {
      if (pending === task) pending = null;
    }
  }
  function publicProfile(result) {
    if (typeof result.user_id !== "string" || !/^[1-9][0-9]{0,19}$/.test(result.user_id)
        || typeof result.display_name !== "string" || !result.display_name.trim()) throw new Error("Invalid profile");
    return { id: result.user_id, name: result.display_name.slice(0, 160) };
  }
  async function start() {
    if (!entry || pending || access || signingOut) return state;
    const task = new AbortController();
    pending = task;
    publish({ phase: "starting" });
    try {
      const flow = await api("device", { body: {}, signal: task.signal });
      if (task.signal.aborted) return state;
      if (typeof flow.device_code !== "string" || !tokenPattern.test(flow.device_code)
          || typeof flow.user_code !== "string" || !/^[0-9A-F]{5}-[0-9A-F]{5}$/.test(flow.user_code)
          || !Number.isInteger(flow.expires_in) || flow.expires_in < 3 || flow.expires_in > 300
          || !Number.isInteger(flow.interval) || flow.interval < 3 || flow.interval > 30) {
        throw new Error("Invalid sign-in request");
      }
      publish({ phase: "pending", code: flow.user_code });
      // Only a URL derived from the locally configured endpoint can open the browser.
      await openBrowser(route("approve"));
      if (!task.signal.aborted) void poll(flow, task);
    } catch {
      if (pending === task) pending = null;
      if (!task.signal.aborted) publish({ phase: "error", error: "service_unavailable" });
    }
    return state;
  }
  function cancel() {
    if (!pending) return state;
    pending.abort();
    pending = null;
    return publish({ phase: "idle" });
  }
  async function refresh() {
    if (!access) return state;
    const token = access;
    try {
      const result = await api("me", { token });
      if (access !== token) return state;
      if (result.error === "unauthorized") {
        access = null;
        return publish({ phase: "error", error: "session_ended" });
      }
      return publish({ phase: "authenticated", user: publicProfile(result) });
    } catch {
      return access === token ? publish({ ...state, error: "service_unavailable" }) : state;
    }
  }
  async function signOut() {
    if (!access) return cancel();
    const token = access;
    access = null;
    signingOut = true;
    publish({ phase: "signing_out" });
    try {
      const result = await api("logout", { body: {}, token });
      if (result.status !== "revoked") throw new Error("Revocation not confirmed");
      return publish({ phase: "idle" });
    } catch {
      return publish({ phase: "error", error: "revocation_unknown" });
    } finally {
      signingOut = false;
    }
  }
  async function authenticatedRequest(action, body) {
    const token = access;
    if (!token) return { error: "unauthorized" };
    const result = await api(action, { body, token });
    if (access !== token) return { error: "unauthorized" };
    if (result.error === "unauthorized") {
      access = null;
      publish({ phase: "error", error: "session_ended" });
    }
    return result;
  }
  async function searchMembers(game, platform, tag) {
    try {
      const result = await authenticatedRequest("member-search", { game, platform, tag });
      if (typeof result.error === "string") return { error: result.error };
      if (!Array.isArray(result.players) || result.players.length > 8) throw new Error("Invalid search response");
      return {
        players: result.players.map(({ user_id, username, gamertag }) => {
          if (typeof user_id !== "string" || !/^[1-9][0-9]{0,19}$/.test(user_id)
              || typeof username !== "string" || !username.trim() || username.length > 160
              || typeof gamertag !== "string" || !gamertag.trim() || gamertag.length > 128) {
            throw new Error("Invalid player");
          }
          return { id: user_id, username, gamertag };
        })
      };
    } catch {
      return { error: "search_unavailable" };
    }
  }
  async function ourGuild(input) {
    try {
      const result = await authenticatedRequest("our-guild", input);
      if (typeof result.error === "string") return { error: result.error };
      const validId = (id) => typeof id === "string" && /^[1-9][0-9]{0,19}$/.test(id);
      const publicGuild = ({ id, title, url }) => {
        const home = new URL(url);
        if (!validId(id) || typeof title !== "string" || home.origin !== entry.origin
            || home.username || home.password || home.search || home.hash
            || !/^\/groups\/[a-zA-Z0-9_.-]+$/.test(home.pathname)) throw new Error("Invalid guild");
        return { id, title, url: home.href };
      };
      if (input.operation === "list") return { guilds: result.guilds.map(publicGuild) };
      if (input.operation === "link") return { guild: publicGuild(result.guild) };
      if (!Array.isArray(result.members) || result.members.length > 30
          || (result.next !== null && !validId(result.next))) throw new Error("Invalid guild roster");
      return { members: result.members.map(({ id, username }) => {
        if (!validId(id) || typeof username !== "string" || !username || username.length > 160) {
          throw new Error("Invalid guild member");
        }
        return { id, username };
      }), next: result.next };
    } catch {
      return { error: "guild_unavailable" };
    }
  }
  function dispose() {
    pending?.abort();
    pending = null;
    access = null;
  }
  return { state: () => state, start, cancel, refresh, signOut, searchMembers, ourGuild, dispose };
}

module.exports = { createNetTwinLogin };
