const { contextBridge, ipcRenderer } = require('electron/renderer')

contextBridge.exposeInMainWorld("config", {
    setCount: count => ipcRenderer.send("set-count", count),
    setResolution: (width, height) => ipcRenderer.send("set-resolution", {width, height}),
    joinRoom: (client, room) => ipcRenderer.send("join-room", {client, room})
})