const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("fanVaultOverlay", {
  getConfig: () => ipcRenderer.invoke("app:get-config"),
  getState: () => ipcRenderer.invoke("overlay:get-state"),
  moveLauncher: (pointer) => ipcRenderer.send("overlay:move-launcher", pointer),
  moveWidget: (pointer) => ipcRenderer.send("overlay:move-widget", pointer),
  resizeWidget: (size) => ipcRenderer.invoke("overlay:resize-widget", size),
  commitPosition: () => ipcRenderer.send("overlay:commit-position"),
  setExpanded: (expanded) => ipcRenderer.invoke("overlay:set-expanded", Boolean(expanded)),
  requestQuit: () => ipcRenderer.invoke("app:request-quit"),
  pickImage: () => ipcRenderer.invoke("app:pick-image"),
  onLayout: (callback) => {
    const listener = (_event, layout) => callback(layout);
    ipcRenderer.on("overlay:layout", listener);
    return () => ipcRenderer.removeListener("overlay:layout", listener);
  }
});
