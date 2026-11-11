const test = require("node:test");
const assert = require("node:assert/strict");
const { createHash, randomBytes } = require("node:crypto");
const { spawn, execFileSync } = require("node:child_process");
const { once } = require("node:events");
const { createServer } = require("node:net");
const { mkdtemp, unlink, rmdir, writeFile } = require("node:fs/promises");
const { join } = require("node:path");
const { tmpdir } = require("node:os");
const { createNetTwinLogin } = require("../../../client/core/nettwin-login");

const php = process.env.FANVAULT_TEST_PHP || "php";
const phpFlags = JSON.parse(process.env.FANVAULT_TEST_PHP_ARGS || "[]");

test("private PHP auth store enforces expiry, revocation and one-time exchange", () => {
  const output = execFileSync(php, [...phpFlags, join(__dirname, "device-authorization.php")], { encoding: "utf8" });
  assert.match(output, /PASS session expires without refresh/);
});

test("desktop login uses real HTTP handlers with a synthetic Sngine session", { timeout: 20000 }, async t => {
  const listener = createServer().listen(0, "127.0.0.1");
  await once(listener, "listening");
  const port = listener.address().port;
  await new Promise((resolve, reject) => listener.close(error => error ? reject(error) : resolve()));
  const directory = await mkdtemp(join(tmpdir(), "fanvault-auth-test-"));
  const database = join(directory, "fixture.sqlite");
  const key = randomBytes(32).toString("hex");
  const origin = `http://127.0.0.1:${port}`;
  const processHandle = spawn(php, [...phpFlags, "-S", `127.0.0.1:${port}`, join(__dirname, "browser-fixture.php")], {
    cwd: directory, windowsHide: true, stdio: ["ignore", "ignore", "pipe"],
    env: { ...process.env, FANVAULT_FIXTURE_KEY: key, FANVAULT_FIXTURE_ORIGIN: origin, FANVAULT_FIXTURE_DB: database }
  });
  const stopped = new Promise(resolve => processHandle.once("close", resolve));
  t.after(async () => {
    processHandle.kill();
    await stopped;
    for (const suffix of ["", "-journal", "-shm", "-wal", ".revoked", ".no-tag", ".left-guild"]) {
      await unlink(database + suffix).catch(error => { if (error.code !== "ENOENT") throw error; });
    }
    await rmdir(directory);
  });
  await new Promise((resolve, reject) => {
    processHandle.once("error", reject);
    processHandle.once("exit", () => reject(new Error("PHP fixture exited before it was ready")));
    processHandle.stderr.on("data", chunk => {
      if (String(chunk).includes("Development Server")) resolve();
    });
  });

  const call = (action, options) => fetch(origin + "/index.php?action=" + action, { ...options, redirect: "error", signal: AbortSignal.timeout(3000) });
  const browser = { Cookie: `c_user=42; xs=${key}` };
  const guest = await call("approve");
  const guestHtml = await guest.text();
  assert.match(guestHtml, /zuerst bei Net-Twin/);
  assert.match(guestHtml, /href="\/signin" target="_blank"/);
  assert.match(guestHtml, /href="\?action=approve">Weiter zur Code-Eingabe/);
  assert.doesNotMatch(guestHtml, /name="user_code"/);
  const style = guestHtml.match(/<style>([\s\S]+)<\/style>/)[1].replace(/\r\n/g, "\n");
  const digest = createHash("sha256").update(style).digest("base64");
  assert.ok(guest.headers.get("content-security-policy").includes(`style-src 'sha256-${digest}'`));
  const wrongAccount = await call("approve", { headers: { Cookie: `c_user=99; xs=${key}` } });
  assert.equal(wrongAccount.status, 403);
  const wrongAccountHtml = await wrongAccount.text();
  assert.match(wrongAccountHtml, /nicht für den Test freigegeben/);
  assert.doesNotMatch(wrongAccountHtml, /href="\/signin"|name="user_code"/);
  assert.equal((await call("me")).status, 401);
  const search = (query, headers = {}) => call("member-search", {
    method: "POST", headers: { ...headers, "Content-Type": "application/json" }, body: JSON.stringify(query)
  });
  assert.equal((await search({ game: "fallout76", platform: "PC", tag: "Fixture Player" })).status, 401);
  assert.equal((await search({}, { Origin: "https://other.invalid" })).status, 403);
  assert.equal((await call("our-guild", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: '{"operation":"list"}'
  })).status, 401);
  const webSearch = options => fetch(origin + "/players.php", { ...options, signal: AbortSignal.timeout(3000) });
  assert.equal((await webSearch()).status, 401);
  const webForm = await (await webSearch({ headers: browser })).text();
  const webCsrf = webForm.match(/name="csrf" value="([a-f0-9]{64})"/)[1];
  assert.match(webForm, /Vollständiger Fallout-76-Gamertag/);
  const submitWeb = (tag, csrf) => webSearch({
    method: "POST", headers: browser, body: new URLSearchParams({ tag, csrf })
  });
  assert.equal((await submitWeb("Fixture Player#1234", "wrong")).status, 403);
  const webMatch = await submitWeb("Fixture Player#1234", webCsrf);
  assert.equal(webMatch.status, 200);
  assert.match(await webMatch.text(), /Fixture Player#1234 · <a[^>]+href="\/fixture-player">/);
  assert.match(await (await submitWeb("Fixture Player", webCsrf)).text(), /Keine passenden Spieler/);
  const changes = new (require("node:events").EventEmitter)();
  let opened = "";
  let bearer;
  const login = createNetTwinLogin({
    baseUrl: origin, openBrowser: url => { opened = url; },
    onChange: state => changes.emit(state.phase, state),
    request: (url, options) => {
      if (options.headers.Authorization) bearer = options.headers.Authorization;
      return fetch(url, options);
    }
  });
  t.after(() => login.dispose());
  async function approve() {
    const ready = once(changes, "authenticated", { signal: AbortSignal.timeout(7000) });
    // Prevent an unhandled rejection if an earlier assertion fails.
    ready.catch(() => {});
    const flow = await login.start();
    assert.deepEqual(Object.keys(flow).sort(), ["code", "phase"]);
    assert.equal(opened, origin + "/index.php?action=approve");
    const html = await (await call("approve", { headers: browser })).text();
    assert.match(html, /name="user_code"/);
    const csrf = html.match(/name="csrf" value="([a-f0-9]{64})"/)[1];
    const form = (originValue, csrfValue, cookie = browser.Cookie) => call("approve", {
      method: "POST", headers: { Cookie: cookie, Origin: originValue },
      body: new URLSearchParams({ user_code: flow.code, csrf: csrfValue, user_id: "999", decision: "approve" })
    });
    assert.equal((await form("https://other.invalid", csrf)).status, 403);
    assert.equal((await form(origin, "wrong")).status, 403);
    assert.equal((await form(origin, csrf, browser.Cookie + "; test_impersonation=1")).status, 401);
    assert.equal((await form(origin, csrf)).status, 200);
    const [state] = await ready;
    assert.deepEqual(state, { phase: "authenticated", user: { id: "42", name: "Test Player" } });
    assert.ok(bearer);
  }
  await approve();
  const firstToken = bearer;
  assert.deepEqual(await login.ourGuild({ operation: "list" }), { guilds: [] });
  assert.deepEqual(await login.ourGuild({ operation: "link", url: origin + "/groups/other-guild" }),
    { error: "guild_manager_required" });
  assert.deepEqual(await login.ourGuild({ operation: "link", url: "https://other.invalid/groups/fixture-guild" }),
    { error: "invalid_guild_home" });
  const home = { id: "7", title: "Fixture Guild", url: origin + "/groups/fixture-guild" };
  assert.deepEqual(await login.ourGuild({ operation: "link", url: home.url }), { guild: home });
  assert.deepEqual(await login.ourGuild({ operation: "link", url: home.url }), { guild: home });
  assert.deepEqual(await login.ourGuild({ operation: "list" }), { guilds: [home] });
  const rosterRequest = { operation: "members", group_id: "7", after: "0" };
  assert.deepEqual(await login.ourGuild(rosterRequest), { members: [
    { id: "42", username: "fixture-leader" }, { id: "43", username: "fixture-player" }
  ], next: null });
  await writeFile(database + ".left-guild", "");
  assert.deepEqual(await login.ourGuild(rosterRequest), { error: "guild_membership_required" });
  assert.deepEqual(await login.ourGuild({ operation: "list" }), { guilds: [] });
  await unlink(database + ".left-guild");
  assert.deepEqual(await login.searchMembers("fallout76", "PC", " fixture player#1234 "), {
    players: [{ id: "43", username: "fixture-player", gamertag: "Fixture Player#1234" }]
  });
  assert.deepEqual(await login.searchMembers("fallout76", "PC", "Fixture"), { players: [] });
  assert.deepEqual(await login.searchMembers("fallout76", "Xbox", "Fixture Player"), { error: "invalid_search" });
  assert.deepEqual(await login.searchMembers("other-game", "PC", "Fixture Player"), { error: "search_unavailable" });
  await writeFile(database + ".no-tag", "");
  assert.deepEqual(await login.searchMembers("fallout76", "PC", "Fixture Player"), { error: "gamertag_required" });
  await unlink(database + ".no-tag");
  assert.deepEqual(await login.signOut(), { phase: "idle" });
  assert.deepEqual(await login.searchMembers("fallout76", "PC", "Fixture Player"), { error: "unauthorized" });
  assert.equal((await call("me", { headers: { Authorization: firstToken } })).status, 401);
  await approve();
  await writeFile(database + ".revoked", "");
  assert.deepEqual(await login.refresh(), { phase: "error", error: "session_ended" });
});
