const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { loadRuntimeConfig } = require("./runtime-config");

// Exercise main-process wiring without opening windows or modifying the user's layout.
async function boot(environment, saved) {
  const handlers = new Map();
  const listeners = new Map();
  const windows = [];
  const area = { x: 100, y: 50, width: 1920, height: 1040 };
  let serverStarts = 0;
  let persisted = saved;
  class Window {
    constructor(options) { this.bounds = { ...options }; windows.push(this); }
    setAlwaysOnTop() {}
    setVisibleOnAllWorkspaces() {}
    loadFile() {}
    once() {}
    isDestroyed() { return false; }
    getBounds() { return this.bounds; }
    setBounds(bounds) { this.bounds = { ...this.bounds, ...bounds }; }
    setPosition(x, y) { this.setBounds({ x, y }); }
    webContents = { send() {} };
  }
  const electron = {
    app: { getPath: () => "unused-test-profile", requestSingleInstanceLock: () => true,
      on() {}, quit() {}, whenReady: () => Promise.resolve() },
    BrowserWindow: Window,
    dialog: { showErrorBox() { throw new Error("Unexpected configuration error"); } },
    globalShortcut: { register() {} },
    ipcMain: { handle: (name, fn) => handlers.set(name, fn), on: (name, fn) => listeners.set(name, fn) },
    screen: { getPrimaryDisplay: () => ({ workArea: area }), getDisplayNearestPoint: () => ({ workArea: area }) }
  };
  const modules = {
    electron, path,
    fs: { readFileSync() { if (!persisted) throw new Error("No saved layout"); return JSON.stringify(persisted); },
      writeFileSync(_file, data) { persisted = JSON.parse(data); } },
    "./core/runtime-config": { loadRuntimeConfig: () => loadRuntimeConfig({ FANVAULT_ENV: environment }) },
    "./local-server": { async startLocalServer() { serverStarts++; return { async close() {} }; } }
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, "../main.js"), "utf8"), {
    require(name) { if (!(name in modules)) throw new Error(`Unexpected import ${name}`); return modules[name]; },
    __dirname: path.join(__dirname, ".."), process: { platform: "win32" }
  });
  await new Promise(resolve => setImmediate(resolve));
  return { handlers, listeners, windows, serverStarts, saved: () => persisted };
}

test("first-run launcher centres; drag and resize survive collapse and a new launch", async () => {
  const app = await boot("development");
  const win = app.windows[0];
  assert.equal(win.bounds.x, 1016);
  assert.equal(win.bounds.y, 526);
  assert.equal(app.serverStarts, 1);
  app.handlers.get("overlay:set-expanded")(null, true);
  app.listeners.get("overlay:move-widget")(null, { x: 300, y: 250, offsetX: 0, offsetY: 0 });
  app.handlers.get("overlay:resize-widget")(null, { width: 620, height: 780 });
  app.handlers.get("overlay:set-expanded")(null, false);
  const saved = app.saved();
  assert.equal(saved.panelWidth, 620);
  assert.equal(saved.panelHeight, 780);
  const reopened = await boot("development", saved);
  assert.equal(reopened.windows[0].bounds.x, saved.x);
  assert.equal(reopened.windows[0].bounds.y, saved.y);
  const layout = reopened.handlers.get("overlay:set-expanded")(null, true);
  assert.equal(layout.panelWidth, 620);
  assert.equal(layout.panelHeight, 780);
});

test("production boots the overlay without starting the demo service", async () => {
  const app = await boot("production", { x: 150, y: 100 });
  assert.equal(app.serverStarts, 0);
  assert.equal(app.windows.length, 1);
  assert.equal(app.windows[0].bounds.x, 150);
  assert.equal(app.handlers.get("app:get-config")().transport.localChatUrl, null);
});
