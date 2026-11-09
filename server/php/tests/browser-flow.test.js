const test = require("node:test");
const assert = require("node:assert/strict");
const { randomBytes } = require("node:crypto");
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
    for (const suffix of ["", "-journal", "-shm", "-wal", ".revoked"]) {
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
  assert.match(await (await call("approve")).text(), /zuerst bei Net-Twin/);
  assert.equal((await call("me")).status, 401);
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
  assert.deepEqual(await login.signOut(), { phase: "idle" });
  assert.equal((await call("me", { headers: { Authorization: firstToken } })).status, 401);
  await approve();
  await writeFile(database + ".revoked", "");
  assert.deepEqual(await login.refresh(), { phase: "error", error: "session_ended" });
});
