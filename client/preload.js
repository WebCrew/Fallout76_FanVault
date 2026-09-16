const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("fanVaultOverlay", {
  getState: () => ipcRenderer.invoke("overlay:get-state"),
  moveLauncher: (pointer) => ipcRenderer.send("overlay:move-launcher", pointer),
  moveWidget: (pointer) => ipcRenderer.send("overlay:move-widget", pointer),
  resizeWidget: (size) => ipcRenderer.invoke("overlay:resize-widget", size),
  commitPosition: () => ipcRenderer.send("overlay:commit-position"),
  setExpanded: (expanded) => ipcRenderer.invoke("overlay:set-expanded", Boolean(expanded)),
  requestQuit: () => ipcRenderer.invoke("app:request-quit"),
  onLayout: (callback) => {
    const listener = (_event, layout) => callback(layout);
    ipcRenderer.on("overlay:layout", listener);
    return () => ipcRenderer.removeListener("overlay:layout", listener);
  }
});
