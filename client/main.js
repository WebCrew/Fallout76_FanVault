const { app, BrowserWindow, globalShortcut, ipcMain, screen } = require("electron");
const fs = require("fs");
const path = require("path");
const { startLocalServer } = require("./local-server");

let win;
let localServer;
let expanded = false;
let launcherPosition = null;
let panelSize = { width: 376, height: 684 };
let layout = { expanded: false, launcherX: 0, launcherY: 0, panelSide: "right", panelWidth: panelSize.width, panelHeight: panelSize.height };

const COLLAPSED_SIZE = 88;
const PANEL_MIN_WIDTH = 340;
const PANEL_MIN_HEIGHT = 440;
const PANEL_MAX_WIDTH = 720;
const PANEL_MAX_HEIGHT = 880;
const EXPANDED_PADDING_WIDTH = 96;
const EXPANDED_PADDING_HEIGHT = 16;
const EDGE_GAP = 12;

function positionFile() {
  return path.join(app.getPath("userData"), "overlay-position.json");
}

function loadPosition() {
  try {
    const saved = JSON.parse(fs.readFileSync(positionFile(), "utf8"));
    if (Number.isFinite(saved.panelWidth)) panelSize.width = Math.max(PANEL_MIN_WIDTH, Math.min(saved.panelWidth, PANEL_MAX_WIDTH));
    if (Number.isFinite(saved.panelHeight)) panelSize.height = Math.max(PANEL_MIN_HEIGHT, Math.min(saved.panelHeight, PANEL_MAX_HEIGHT));
    if (Number.isFinite(saved.x) && Number.isFinite(saved.y)) return saved;
  } catch (_error) {
    // First launch or an invalid old position: use the safe default below.
  }
  const area = screen.getPrimaryDisplay().workArea;
  return { x: area.x + EDGE_GAP, y: area.y + Math.round((area.height - COLLAPSED_SIZE) / 2) };
}

function savePosition() {
  try {
    fs.writeFileSync(positionFile(), JSON.stringify({ ...launcherPosition, panelWidth: panelSize.width, panelHeight: panelSize.height }));
  } catch (_error) {
    // Position persistence is convenient, but never blocks the overlay.
  }
}

function clampLauncher(x, y) {
  const display = screen.getDisplayNearestPoint({ x, y });
  const area = display.workArea;
  return {
    x: Math.max(area.x, Math.min(Math.round(x), area.x + area.width - COLLAPSED_SIZE)),
    y: Math.max(area.y, Math.min(Math.round(y), area.y + area.height - COLLAPSED_SIZE))
  };
}

function expandedBounds() {
  const display = screen.getDisplayNearestPoint(launcherPosition);
  const area = display.workArea;
  const width = Math.min(panelSize.width + EXPANDED_PADDING_WIDTH, area.width);
  const height = Math.min(panelSize.height + EXPANDED_PADDING_HEIGHT, area.height);
  const launcherCenter = launcherPosition.x + COLLAPSED_SIZE / 2;
  const panelSide = launcherCenter < area.x + area.width / 2 ? "right" : "left";
  let x = panelSide === "right" ? launcherPosition.x : launcherPosition.x + COLLAPSED_SIZE - width;
  let y = launcherPosition.y;
  x = Math.max(area.x, Math.min(x, area.x + area.width - width));
  y = Math.max(area.y, Math.min(y, area.y + area.height - height));
  return {
    bounds: { x, y, width, height },
    layout: {
      expanded: true,
      launcherX: launcherPosition.x - x,
      launcherY: launcherPosition.y - y,
      panelSide,
      panelWidth: width - EXPANDED_PADDING_WIDTH,
      panelHeight: height - EXPANDED_PADDING_HEIGHT
    }
  };
}

function sendLayout() {
  if (win && !win.isDestroyed()) win.webContents.send("overlay:layout", layout);
}

function setExpanded(nextExpanded) {
  if (!win || win.isDestroyed()) return layout;
  expanded = nextExpanded;
  if (expanded) {
    const next = expandedBounds();
    layout = next.layout;
    win.setBounds(next.bounds, true);
  } else {
    launcherPosition = clampLauncher(launcherPosition.x, launcherPosition.y);
    layout = { expanded: false, launcherX: 0, launcherY: 0, panelSide: "right", panelWidth: panelSize.width, panelHeight: panelSize.height };
    win.setBounds({ ...launcherPosition, width: COLLAPSED_SIZE, height: COLLAPSED_SIZE }, true);
    savePosition();
  }
  sendLayout();
  return layout;
}

function createWindow() {
  const saved = loadPosition();
  launcherPosition = clampLauncher(saved.x, saved.y);
  win = new BrowserWindow({
    ...launcherPosition,
    width: COLLAPSED_SIZE,
    height: COLLAPSED_SIZE,
    transparent: true,
    frame: false,
    resizable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    hasShadow: false,
    show: false,
    title: "FanVault - Fallout 76 Clan Companion",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
      devTools: true
    }
  });

  win.setAlwaysOnTop(true, "screen-saver");
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  win.loadFile(path.join(__dirname, "index.html"));
  win.once("ready-to-show", () => win.showInactive());
}

ipcMain.handle("overlay:get-state", () => layout);
ipcMain.handle("overlay:set-expanded", (_event, nextExpanded) => setExpanded(nextExpanded));
ipcMain.on("overlay:move-launcher", (_event, pointer) => {
  if (expanded || !pointer || !Number.isFinite(pointer.x) || !Number.isFinite(pointer.y) || !Number.isFinite(pointer.offsetX) || !Number.isFinite(pointer.offsetY)) return;
  const next = clampLauncher(pointer.x - pointer.offsetX, pointer.y - pointer.offsetY);
  launcherPosition = next;
  win.setPosition(next.x, next.y, false);
});
ipcMain.on("overlay:move-widget", (_event, pointer) => {
  if (!expanded || !pointer || !Number.isFinite(pointer.x) || !Number.isFinite(pointer.y)) return;
  const current = win.getBounds();
  const display = screen.getDisplayNearestPoint({ x: pointer.x, y: pointer.y });
  const area = display.workArea;
  const x = Math.max(area.x, Math.min(Math.round(pointer.x - pointer.offsetX), area.x + area.width - current.width));
  const y = Math.max(area.y, Math.min(Math.round(pointer.y - pointer.offsetY), area.y + area.height - current.height));
  win.setPosition(x, y, false);
  launcherPosition = clampLauncher(x + layout.launcherX, y + layout.launcherY);
});
ipcMain.handle("overlay:resize-widget", (_event, requested) => {
  if (!expanded || !requested) return layout;
  panelSize = {
    width: Math.max(PANEL_MIN_WIDTH, Math.min(Math.round(requested.width || panelSize.width), PANEL_MAX_WIDTH)),
    height: Math.max(PANEL_MIN_HEIGHT, Math.min(Math.round(requested.height || panelSize.height), PANEL_MAX_HEIGHT))
  };
  const current = win.getBounds();
  const display = screen.getDisplayNearestPoint({ x: current.x, y: current.y });
  const area = display.workArea;
  const width = Math.min(panelSize.width + EXPANDED_PADDING_WIDTH, area.width);
  const height = Math.min(panelSize.height + EXPANDED_PADDING_HEIGHT, area.height);
  const x = Math.max(area.x, Math.min(current.x, area.x + area.width - width));
  const y = Math.max(area.y, Math.min(current.y, area.y + area.height - height));
  win.setBounds({ x, y, width, height }, true);
  launcherPosition = clampLauncher(x + layout.launcherX, y + layout.launcherY);
  layout = { ...layout, panelWidth: width - EXPANDED_PADDING_WIDTH, panelHeight: height - EXPANDED_PADDING_HEIGHT };
  sendLayout();
  return layout;
});
ipcMain.on("overlay:commit-position", () => {
  if (!expanded && launcherPosition) savePosition();
});

const hasSingleInstanceLock = app.requestSingleInstanceLock();

if (!hasSingleInstanceLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (!win || win.isDestroyed()) return;
    if (!win.isVisible()) win.showInactive();
    win.focus();
  });
}

app.whenReady().then(async () => {
  try {
    localServer = await startLocalServer();
  } catch (error) {
    if (error.code !== "EADDRINUSE") throw error;
    // Development convenience: reuse an already running local server.
  }

  createWindow();

  globalShortcut.register("Control+Shift+F", () => {
    if (!win) return;
    if (win.isVisible()) win.hide();
    else win.showInactive();
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("will-quit", () => {
  globalShortcut.unregisterAll();
  if (localServer) localServer.close().catch(() => {});
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
