const {app, BrowserWindow, BrowserView, ipcMain, dialog} = require("electron");
const {join} = require("path");
const Store = require("electron-store");

let mainWin;
let configWin;

let clients = [];

const config = new Store({
    defaults: {
        count: 1,
        resolution: {
            width: 1920,
            height: 1080
        },
        transparent: true,
        nospecbar: true,
        skiplogin: true,
        savereplays: false,
        replaysdir: join(app.getPath("documents"), "MultiStream Replays"),
        css: "/* Custom CSS here will be added into each client */"
    }
});

function createView(x, y, nx, ny) {
    const view = new BrowserView({
        webPreferences: {
            preload: join(__dirname, "preload.js"),
            partition: `persist:partition-${x}-${y}`,
            nodeIntegration: false,
            nodeIntegrationInSubFrames: false,
            enableRemoteModule: false,
            contextIsolation: false,
            backgroundThrottling: false,
            nativeWindowOpen: true,
            disableBlinkFeatures: 'PreloadMediaEngagementData,AutoplayIgnoreWebAudio,MediaEngagementBypassAutoplayPolicies'
        }
    });

    view.webContents.openDevTools({mode: "undocked"});
    view.webContents.loadURL("https://tetr.io");

    view.webContents.on("will-frame-navigate", e => {
        const url = new URL(e.url);

        if (url.hostname !== "tetr.io" || url.pathname !== "/") {
            e.preventDefault();
        }
    });

    view.webContents.setWindowOpenHandler(() => {
        return {action: "deny"};
    });

    view.webContents.session.on("will-download", (e, item) => {
        if (item.getFilename().endsWith(".ttrm")) {
            item.setSavePath(join(config.get("replaysdir"), `replay-${Date.now()}-${Math.floor(Math.random()*1000)}.ttrm`));
        }
    });

    view.webContents.on("did-finish-load", () => {
        view.webContents.insertCSS(config.get("css"));
    });

    mainWin.addBrowserView(view);

    function setSize() {
        const [w, h] = mainWin.getContentSize();
        view.setBounds({
            x: Math.floor(x * (w / nx)),
            y: Math.floor(y * (h / ny)),
            width: Math.floor(w / nx),
            height: Math.floor(h / ny)
        });
    }

    mainWin.on("resized", setSize);
    setSize();

    clients.push({view, setSize});
}

function createViews(count) {
    for (const {view} of clients) {
        mainWin.removeBrowserView(view);
    }

    clients = [];

    let nx = 1;
    let ny = 1;

    switch (count) {
        case 4:
            nx = 2;
            ny = 2;
            break;
        case 2:
            nx = 2;
            break;
    }

    for (let y = 0; y < ny; y++) {
        for (let x = 0; x < nx; x++) {
            createView(x, y, nx, ny);
        }
    }
}

app.commandLine.appendSwitch('--disable-gpu-sandbox');
app.commandLine.appendSwitch('--enable-webgl2-compute-context');
app.commandLine.appendSwitch('--lang', 'en-US');
app.commandLine.appendSwitch('--no-sandbox');
app.commandLine.appendSwitch('--force-discrete-gpu', '1');
app.commandLine.appendSwitch('--enable-high-resolution-time');
app.commandLine.appendSwitch('--enable-zero-copy');
app.commandLine.appendSwitch('--ignore-gpu-blacklist');
app.commandLine.appendSwitch('--autoplay-policy', 'no-user-gesture-required');

ipcMain.on("set-count", (event, count) => {
    if (!count) return;
    createViews(count);
    config.set("count", count);
});

ipcMain.on("set-resolution", (event, {width, height}) => {
    if (!width || !height) return;
    mainWin.setResizable(true);
    mainWin.setSize(width, height);
    mainWin.setResizable(false);
    mainWin.center();
    for (const {setSize} of clients) {
        setSize();
    }

    config.set("resolution.width", width);
    config.set("resolution.height", height);
});

ipcMain.on("join-room", (event, {client, room}) => {
    if (!room) return;
    const index = parseInt(client) || 0;

    if (index >= clients.length) {
        return dialog.showErrorBox("No such client", "You don't have enough active clients.");
    }

    clients[index].view.webContents.send("join-room", room);
});

ipcMain.on("reload-client", (event, client) => {
    const index = parseInt(client) || 0;

    if (index >= clients.length) {
        return dialog.showErrorBox("No such client", "You don't have enough active clients.");
    }

    clients[index].view.webContents.reloadIgnoringCache();
});

ipcMain.on("set-save-folder", async event => {
    const res = await dialog.showOpenDialog(configWin, {
        title: "Where should replays be saved?",
        properties: ["openDirectory"]
    });

    event.reply("save-folder-set", res.filePaths[0]);

    if (res.filePaths[0]) {
        config.set("replaysdir", res.filePaths[0]);
    }
});

ipcMain.on("get-config", (event, key) => {
    event.returnValue = config.get(key);
});

ipcMain.on("set-config", (event, {key, value}) => {
    config.set(key, value);
});

app.whenReady().then(() => {
    mainWin = new BrowserWindow({
        width: config.get("resolution.width"),
        height: config.get("resolution.height"),
        useContentSize: true,
        resizable: false,
        maximizable: false,
        minimizable: false,
        transparent: true,
        frame: false,
        title: "MultiStream",
        center: true
    });

    mainWin.setMenu(null);
    mainWin.webContents.loadFile(join(__dirname, "background.html"));

    configWin = new BrowserWindow({
        width: 600,
        height: 800,
        title: "MultiStream Config",
        resizable: false,
        maximizable: false,
        webPreferences: {
            preload: join(__dirname, "configpreload.js")
        }
    });

    configWin.setMenuBarVisibility(false);
    configWin.webContents.loadFile(join(__dirname, "config.html"));

    createViews(config.get("count"));
});