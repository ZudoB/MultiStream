const {app, BrowserWindow, BrowserView, ipcMain, dialog, shell, screen, net} = require("electron");
const {join} = require("path");
const Store = require("electron-store");
const {doJSModification} = require("./intercept");

let mainWin;
let configWin;

const config = new Store({
    defaults: {
        layout: "1x1",
        clientorder: [0, 1, 2, 3],
        smartlayout: false,
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
        nointercept: false,
        devtools: false,
        replaysdir: join(app.getPath("documents"), "MultiStream Replays"),
        css: "/* Custom CSS here will be added into each client */",
        zoom: 100,
        framerate: 60
    }
});

function createView(index) {
    const view = new BrowserView({
        webPreferences: {
            preload: join(__dirname, "preload.js"),
            partition: `persist:partition-${index}`,
            nodeIntegration: false,
            nodeIntegrationInSubFrames: false,
            enableRemoteModule: false,
            contextIsolation: false,
            backgroundThrottling: false,
            nativeWindowOpen: true,
            disableBlinkFeatures: 'PreloadMediaEngagementData,AutoplayIgnoreWebAudio,MediaEngagementBypassAutoplayPolicies'
        }
    });

    view.webContents.loadURL(`https://tetr.io/?__multistream_client_index=${index}`);

    if (config.get("devtools")) view.webContents.openDevTools({mode: "undocked"});

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

    if (view.webContents.session.protocol.isProtocolHandled("multistream")) {
        view.webContents.session.protocol.unhandle("multistream");
    }

    view.webContents.session.protocol.handle("multistream", async () => {
        const tetriojs = await net.fetch("https://tetr.io/js/tetrio.js");
        const text = await tetriojs.text();
        const newtext = await doJSModification(text);

        return new Response(newtext, {
            headers: {
                "Content-Type": "application/javascript"
            }
        })
    });

    view.webContents.session.webRequest.onBeforeRequest({
        urls: ["*://*.tetr.io/js/tetrio.js*"]
    }, (details, callback) => {
        if (config.get("nointercept")) return callback({cancel: false});
        callback({redirectURL: "multistream://tetrio.js"});
    });

    mainWin.addBrowserView(view);

    function setSize(x, y, width, height) {
        const [w, h] = mainWin.getContentSize();

        const baseWidth = Math.floor(w / 2);
        const baseHeight = Math.floor(h / 2);

        const baseX = x * baseWidth;
        const baseY = y * baseHeight;

        view.setBounds({
            x: baseX,
            y: baseY,
            width: baseWidth * width,
            height: baseHeight * height
        });
    }

    return {view, setSize};
}

const baseClients = []; // FIXED index
let clients = []; // user defined index

const LAYOUTS = {
    "1x1": [[0, 0, 2, 2]],
    "1x2": [[0, 0, 2, 1], [0, 1, 2, 1]],
    "2x1": [[0, 0, 1, 2], [1, 0, 1, 2]],
    "1L-2R": [[0, 0, 1, 2], [1, 0, 1, 1], [1, 1, 1, 1]],
    "2L-1R": [[0, 0, 1, 1], [1, 0, 1, 2], [0, 1, 1, 1]],
    "1T-2B": [[0, 0, 2, 1], [0, 1, 1, 1], [1, 1, 1, 1]],
    "2T-1B": [[0, 0, 1, 1], [1, 0, 1, 1], [0, 1, 2, 1]],
    "2x2": [[0, 0, 1, 1], [1, 0, 1, 1], [0, 1, 1, 1], [1, 1, 1, 1]]
};

function createViews() {
    const clientorder = config.get("clientorder");
    for (let i = 0; i < 4; i++) {
        const client = createView(i);
        client.setSize(i % 2, Math.floor(i / 2), 1, 1);
        mainWin.addBrowserView(client.view);
        baseClients[i] = client;
        clients[clientorder[i]] = client;
    }
}

function applyLayout() {
    const layoutData = LAYOUTS[config.get("layout")];

    if (!layoutData) return;

    for (const {view} of clients) {
        view.setBounds({x: 0, y: 0, width: 0, height: 0});
    }

    for (let i = 0; i < layoutData.length; i++) {
        if (!clients[i]) break;
        clients[i].setSize(...layoutData[i]);
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
    mainWin.setResizable(true);

    const chosenDisplay = screen.getAllDisplays().find(d => d.id === parseInt(display));

    if (chosenDisplay) {
        mainWin.setBounds(chosenDisplay.bounds);
    }

    mainWin.setSize(width, height);
    mainWin.setResizable(false);
    mainWin.center();
    applyLayout();
}

ipcMain.on("set-resolution", (event, {width, height, display, framerate}) => {
    if (!width || !height) return;

    moveMainWinToDisplay(display, width, height);

    config.set("resolution.width", width);
    config.set("resolution.height", height);
    config.set("resolution.display", display);
    config.set("framerate", framerate);

    for (const {view} of clients) {
        view.webContents.send("set-framerate", framerate);
    }

    applyLayout();
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

ipcMain.on("load-replay", (event, {client, content}) => {
    const index = parseInt(client) || 0;

    if (index >= clients.length) {
        return dialog.showErrorBox("No such client", "You don't have enough active clients.");
    }

    clients[index].view.webContents.send("load-replay", content);
});

ipcMain.on("set-layout", (event, layout) => {
    if (!LAYOUTS[layout]) return;
    config.set("layout", layout);
    applyLayout();
});

function setClientOrder(order) {
    const newClients = [];

    for (let i = 0; i < order.length; i++) {
        newClients[i] = baseClients[order[i]];
    }

    clients = newClients;

    config.set("clientorder", order);
    applyLayout();
}

function swapClients(clientA, clientB) {
    const order = config.get("clientorder");

    const temp = order[clientA];
    order[clientA] = order[clientB];
    order[clientB] = temp;

    setClientOrder(order);
}


const clientsInGame = new Set();

ipcMain.on("swap-clients", (event, {clientA, clientB}) => {
    swapClients(clientA, clientB);
});

ipcMain.on("client-status", (event, status) => {
    if (status.ingame) {
        clientsInGame.add(status.client);
    } else {
        clientsInGame.delete(status.client);
    }

    status.client = config.get("clientorder").indexOf(status.client); // real client index
    configWin.webContents.send("client-status", status);
});

ipcMain.on("set-zoom", (event, zoom) => {
    for (const {view} of clients) {
        view.webContents.setZoomFactor(zoom / 100);
    }
});

setInterval(() => {
    if (config.get("smartlayout")) {
        let newlayout;

        switch (clientsInGame.size) {
            case 4:
                newlayout = "2x2";
                break;
            case 3:
                newlayout = "1L-2R";
                break;
            case 2:
                newlayout = "2x1";
                break;
            default:
                newlayout = "1x1";
                break;
        }

        const neworder = config.get("clientorder").sort((a, b) => {
            if (clientsInGame.has(a) && !clientsInGame.has(b)) return -1;
            if (!clientsInGame.has(a) && clientsInGame.has(b)) return 1;
            return 0;
        });

        setClientOrder(neworder);
        config.set("layout", newlayout);

        applyLayout();
    }
}, 3000);

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

    createViews();
    applyLayout();
}

let quitting = false;

app.whenReady().then(() => {
    if (!app.requestSingleInstanceLock()) {
        app.quit();
    } else {
        setup();
    }
});