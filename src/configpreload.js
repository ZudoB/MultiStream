const {contextBridge, ipcRenderer} = require("electron/renderer");

contextBridge.exposeInMainWorld("config", {
    getConfig: key => ipcRenderer.sendSync("get-config", key),
    setConfig: (key, value) => ipcRenderer.send("set-config", {key, value}),
    setResolution: (width, height, display, framerate) => ipcRenderer.send("set-resolution", {width, height, display, framerate}),
    joinRoom: (client, room) => ipcRenderer.send("join-room", {client, room}),
    reloadClient: client => ipcRenderer.send("reload-client", client),
    selectReplayDir: () => {
        return new Promise(resolve => {
            ipcRenderer.once("save-folder-set", (e, dir) => resolve(dir));
            ipcRenderer.send("set-save-folder");
        });
    },
    getScreens: () => ipcRenderer.sendSync("get-screens"),
    loadReplay: (client, content) => ipcRenderer.send("load-replay", {client, content}),
    setLayout: layout => ipcRenderer.send("set-layout", layout),
    swapClients: (clientA, clientB) => ipcRenderer.send("swap-clients", {clientA, clientB}),
    onClientStatus: callback => ipcRenderer.on("client-status", (e, status) => callback(status)),
    setZoom: zoom => ipcRenderer.send("set-zoom", zoom),
})