const { app, BrowserWindow, globalShortcut } = require('electron');
const path = require('path');

let win;

function createWindow() {
  win = new BrowserWindow({
    width: 1080,
    height: 720,
    minWidth: 960,
    minHeight: 620,
    backgroundColor: '#0b1015',
    autoHideMenuBar: true,
    title: 'FanVault - Fallout 76 Clan Companion',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      devTools: true
    }
  });

  win.loadFile(path.join(__dirname, 'index.html'));
}

app.whenReady().then(() => {
  createWindow();

  globalShortcut.register('Control+Shift+F', () => {
    if (!win) return;
    if (win.isVisible()) win.hide();
    else win.show();
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
