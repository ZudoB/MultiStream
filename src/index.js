const {app, BrowserWindow, BrowserView, ipcMain, dialog, shell, screen} = require("electron");
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
            height: 1080,
            display: undefined
        },
        frame: false,
        transparent: true,
        nospecbar: true,
        skiplogin: true,
        blockads: true,
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

    // view.webContents.openDevTools({mode: "undocked"});
    view.webContents.loadURL("https://tetr.io");

    view.webContents.on("will-frame-navigate", e => {
        const url = new URL(e.url);

        if (url.hostname !== "tetr.io" || url.pathname !== "/") {
            e.preventDefault();
        }
    });

    // block window opens
    view.webContents.setWindowOpenHandler(() => {
        return {action: "deny"};
    });

    // if a replay is downloaded, intercept and save
    view.webContents.session.on("will-download", (e, item) => {
        if (item.getFilename().endsWith(".ttrm")) {
            item.setSavePath(join(config.get("replaysdir"), `replay-${Date.now()}-${Math.floor(Math.random() * 1000)}.ttrm`));
        }
    });

    // inject custom css
    view.webContents.on("did-finish-load", () => {
        view.webContents.insertCSS(config.get("css"));
    });

    // block enthusiast gaming ad network
    view.webContents.session.webRequest.onBeforeSendHeaders({
        urls: ["*://*.enthusiastgaming.net/*"]
    }, (details, callback) => {
        callback({cancel: config.get("blockads")});
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
        view.webContents.destroy();
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

function moveMainWinToDisplay(display, width, height) {
    const chosenDisplay = screen.getAllDisplays().find(d => d.id === parseInt(display));

    if (chosenDisplay) {
        mainWin.setBounds(chosenDisplay.bounds);
        mainWin.setResizable(true);
        mainWin.setSize(width, height);
        mainWin.setResizable(false);
        mainWin.center();
    }
}

ipcMain.on("set-count", (event, count) => {
    if (!count) return;
    createViews(count);
    config.set("count", count);
});

ipcMain.on("set-resolution", (event, {width, height, display}) => {
    if (!width || !height) return;

    moveMainWinToDisplay(display, width, height);

    for (const {setSize} of clients) {
        setSize();
    }

    config.set("resolution.width", width);
    config.set("resolution.height", height);
    config.set("resolution.display", display);
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

ipcMain.on("get-screens", event => {
    event.returnValue = screen.getAllDisplays().map(display => {
        return {
            id: display.id,
            label: display.label,
            bounds: display.bounds,
        };
    });
});

function setup() {
    mainWin = new BrowserWindow({
        useContentSize: true,
        resizable: false,
        maximizable: false,
        minimizable: false,
        closable: false,
        transparent: true,
        title: "MultiStream",
        center: true,
        frame: config.get("frame"),
        show: false
    });


    mainWin.setMenu(null);
    mainWin.webContents.loadFile(join(__dirname, "background.html"));
    moveMainWinToDisplay(config.get("resolution.display"), config.get("resolution.width"), config.get("resolution.height"));

    configWin = new BrowserWindow({
        width: 600,
        height: 800,
        title: "MultiStream Config",
        resizable: false,
        maximizable: false,
        show: false,
        webPreferences: {
            preload: join(__dirname, "configpreload.js"),
            nodeIntegration: false,
            contextIsolation: true,
            nativeWindowOpen: true
        }
    });

    mainWin.on("close", event => {
        if (!quitting) event.preventDefault();
    });

    mainWin.on("ready-to-show", () => {
        mainWin.show();
    });

    configWin.setMenuBarVisibility(false);
    configWin.webContents.loadFile(join(__dirname, "config.html"));

    // handle window open by using browser
    configWin.webContents.setWindowOpenHandler(({url}) => {
        shell.openExternal(url);
        return {action: "deny"};
    });

    configWin.on("close", event => {
        if (quitting) return;

        // confirm app quit
        const res = dialog.showMessageBoxSync({
            type: "question",
            buttons: ["Quit", "Cancel"],
            title: "Confirm",
            message: "Are you sure you want to quit? All clients will be closed."
        });

        if (res === 1) {
            event.preventDefault();
        } else {
            quitting = true;
            mainWin.setClosable(true);
            for (const {view} of clients) {
                mainWin.removeBrowserView(view);
            }
            mainWin.close();
            app.quit();
        }
    });

    configWin.on("ready-to-show", () => {
        configWin.show();
    });

    createViews(config.get("count"));
}

let quitting = false;

app.whenReady().then(() => {
    if (!app.requestSingleInstanceLock()) {
        app.quit();
    } else {
        setup();
    }
});