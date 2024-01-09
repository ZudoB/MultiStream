const {app, BrowserWindow, BrowserView, ipcMain, dialog} = require("electron");
const {join} = require("path");

let mainWin;
let configWin;

const W = 1920;
const H = 1080;

let views = [];

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

    view.webContents.loadURL("https://tetr.io");

    view.webContents.on("will-frame-navigate", e => {
        e.preventDefault();
    });

    view.webContents.setWindowOpenHandler(() => {
        return {action: "deny"};
    });

    view.webContents.session.on("will-download", (e, item) => {
        if (item.getFilename().endsWith(".ttrm")) {
            item.setSavePath(join(__dirname, `replay-${Date.now()}.ttrm`));
        }
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

    views.push({view, setSize});
}

function createViews(count) {
    for (const {view} of views) {
        mainWin.removeBrowserView(view);
    }

    views = [];

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
});

ipcMain.on("set-resolution", (event, {width, height}) => {
    if (!width || !height) return;
    mainWin.setResizable(true);
    mainWin.setSize(width, height);
    mainWin.setResizable(false);
    for (const {setSize} of views) {
        setSize();
    }
});

ipcMain.on("join-room", (event, {client, room}) => {
    if (!room) return;
    const index = parseInt(client) || 0;

    if (index >= views.length) {
        return dialog.showErrorBox("No such client", "You don't have enough active clients.");
    }

    views[index].view.webContents.send("join-room", room);
});

app.whenReady().then(() => {
    mainWin = new BrowserWindow({
        width: W,
        height: H,
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
        title: "MultiStream Config",
        resizable: false,
        maximizable: false,
        webPreferences: {
            preload: join(__dirname, "configpreload.js")
        }
    });

    // configWin.setMenu(null);
    configWin.webContents.loadFile(join(__dirname, "config.html"));

    createViews(1);
});