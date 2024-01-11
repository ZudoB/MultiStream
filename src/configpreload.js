const {contextBridge, ipcRenderer} = require("electron/renderer");

contextBridge.exposeInMainWorld("config", {
    getConfig: key => ipcRenderer.sendSync("get-config", key),
    setConfig: (key, value) => ipcRenderer.send("set-config", {key, value}),
    setCount: count => ipcRenderer.send("set-count", count),
    setResolution: (width, height, display) => ipcRenderer.send("set-resolution", {width, height, display}),
    joinRoom: (client, room) => ipcRenderer.send("join-room", {client, room}),
    reloadClient: client => ipcRenderer.send("reload-client", client),
    selectReplayDir: () => {
        return new Promise(resolve => {
            ipcRenderer.once("save-folder-set", (e, dir) => resolve(dir));
            ipcRenderer.send("set-save-folder");
        });
    },
    getScreens: () => ipcRenderer.sendSync("get-screens"),
})