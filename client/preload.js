const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("fanVaultOverlay", {
  getConfig: () => ipcRenderer.invoke("app:get-config"),
  loginState: () => ipcRenderer.invoke("auth:state"),
  startLogin: () => ipcRenderer.invoke("auth:start"),
  cancelLogin: () => ipcRenderer.invoke("auth:cancel"),
  refreshLogin: () => ipcRenderer.invoke("auth:refresh"),
  signOut: () => ipcRenderer.invoke("auth:sign-out"),
  onLoginState: (callback) => {
    const listener = (_event, state) => callback(state);
    ipcRenderer.on("auth:changed", listener);
    return () => ipcRenderer.removeListener("auth:changed", listener);
  },
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
