const test = require("node:test");
const assert = require("node:assert/strict");
const { randomBytes } = require("node:crypto");
const { spawn, execFileSync } = require("node:child_process");
const { once } = require("node:events");
const { createServer } = require("node:net");
const { mkdtemp, unlink, rmdir } = require("node:fs/promises");
const { join } = require("node:path");
const { tmpdir } = require("node:os");

const php = process.env.FANVAULT_TEST_PHP || "php";
const phpFlags = JSON.parse(process.env.FANVAULT_TEST_PHP_ARGS || "[]");

test("private PHP auth store enforces expiry, revocation and one-time exchange", () => {
  const output = execFileSync(php, [...phpFlags, join(__dirname, "device-authorization.php")], { encoding: "utf8" });
  assert.match(output, /PASS session expires without refresh/);
});

test("browser approval and desktop exchange work across separate HTTP requests", { timeout: 15000 }, async t => {
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
    for (const suffix of ["", "-journal", "-shm", "-wal"]) {
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

  const call = (path, options) => fetch(origin + path, { ...options, redirect: "error", signal: AbortSignal.timeout(3000) });
  const post = (path, body) => call(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  assert.equal((await call("/approve")).status, 401);
  assert.equal((await call("/me")).status, 401);
  const flow = await (await post("/device", {})).json();
  assert.match(flow.device_code, /^[A-Za-z0-9_-]{43}$/);
  const browser = { Cookie: `fv_fixture=${key}` };
  const html = await (await call("/approve", { headers: browser })).text();
  const csrf = html.match(/name="csrf" value="([a-f0-9]{64})"/)[1];
  assert.ok(!html.includes(flow.device_code));
  const form = (originValue, csrfValue) => call("/approve", {
    method: "POST", headers: { ...browser, Origin: originValue },
    body: new URLSearchParams({ user_code: flow.user_code, csrf: csrfValue, user_id: "999" })
  });
  assert.equal((await form("https://other.invalid", csrf)).status, 403);
  assert.equal((await form(origin, "wrong")).status, 403);
  assert.equal((await form(origin, csrf)).status, 200);
  const result = await (await post("/exchange", { device_code: flow.device_code })).json();
  const credentials = { Authorization: `Bearer ${result.access_token}` };
  const me = await (await call("/me", { headers: credentials })).json();
  assert.deepEqual(me, { user_id: "42", display_name: "Test Player" });
  assert.equal((await post("/exchange", { device_code: flow.device_code })).status, 400);
  assert.equal((await call("/logout", { method: "POST", headers: credentials })).status, 200);
  assert.equal((await call("/me", { headers: credentials })).status, 401);
});
