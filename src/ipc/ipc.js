import { dialog, ipcMain, screen } from "electron";
import { config } from "../store/store.js";
import { moveWinToDisplay } from "../background/background.js";
import {
	getBackgroundWindow,
	getClientByLetter,
	getClients,
	getConfigWindow,
	getLeftSideUser,
	setLayout,
	setLeftSideUser,
	swapClients,
	ws
} from "../app.js";
function getClientIDFromURL(url) {
	return parseInt(new URL(url).searchParams.get("__multistream_client_index"));
}

export function enableIPC(backgroundWin, configWin) {
	ipcMain.on("set-resolution", (event, { width, height, display, framerate }) => {
		if (!width || !height) return;

		moveWinToDisplay(backgroundWin, display, width, height);

		config.set("resolution.width", width);
		config.set("resolution.height", height);
		config.set("resolution.display", display);
		config.set("framerate", framerate);

		for (const view of getClients()) {
			view.webContents.send("set-framerate", framerate);
		}
	});

	ipcMain.on("join-room", (event, { client, room }) => {
		if (!room) return;

		const c = getClientByLetter(client);
		c.webContents.send("join-room", room);
		c.webContents.send("request-status");
	});

	ipcMain.on("reload-client", async (event, client) => {
		const c = getClientByLetter(client);

		const index = config.get("clientorder").find(([letter]) => letter === client)[1];

		getBackgroundWindow().once("focus", () => getConfigWindow().focus());

		await c.webContents.loadURL(`https://tetr.io/?__multistream_client_index=${index}`);
		c.webContents.send("request-status");
	});

	ipcMain.on("kill-client", async (event, client) => {
		const c = getClientByLetter(client);

		getBackgroundWindow().once("focus", () => getConfigWindow().focus());

		await c.webContents.loadURL("about:blank");
		configWin.webContents.send("client-status", { client, dead: true, players: 0 });
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

	ipcMain.on("set-config", (event, { key, value }) => {
		config.set(key, value);
	});

	ipcMain.on("get-screens", event => {
		event.returnValue = screen.getAllDisplays().map(display => {
			return {
				id: display.id,
				label: display.label,
				bounds: display.bounds
			};
		});
	});

	ipcMain.on("load-replay", (event, { client, content }) => {
		const c = getClientByLetter(client);

		c.webContents.send("load-replay", content);
		c.webContents.send("request-status");
	});

	ipcMain.on("set-layout", (event, layout) => {
		setLayout(layout);
	});

	ipcMain.on("swap-clients", (event, { clientA, clientB }) => {
		swapClients(clientA, clientB);

		getClientByLetter(clientA).webContents.send("request-status");
		getClientByLetter(clientB).webContents.send("request-status");
	});

	ipcMain.on("client-status", (event, status) => {
		status.client = config.get("clientorder").find(([, index]) => index === status.client)[0];

		// pick a left side user
		const currentLeftUser = getLeftSideUser(status.client);

		if (!currentLeftUser || (currentLeftUser !== status.p1?.userid && currentLeftUser !== status.p2?.userid)) {
			setLeftSideUser(status.client, status.p1?.userid);
		}

		try {
			configWin.webContents.send("client-status", status);
			ws.handleClientStatus(status);
		} catch {
			// chances are we're quitting, so drop
		}
	});

	ipcMain.on("get-left-side-user", (event, client) => {
		event.returnValue = getLeftSideUser(client);
	});

	ipcMain.on("set-left-side-user", (event, { client, user }) => {
		const c = getClientByLetter(client);

		setLeftSideUser(client, user);
		c.webContents.send("request-status");
	});

	ipcMain.on("set-zoom", (event, zoom) => {
		for (const view of getClients()) {
			view.webContents.setZoomFactor(zoom / 100);
		}
	});

	ipcMain.on("ribbon-send", (event, message) => {
		ws.handleRibbonSend(getClientIDFromURL(event.sender.getURL()), message);
	});

	ipcMain.on("ribbon-receive", (event, message) => {
		ws.handleRibbonReceive(getClientIDFromURL(event.sender.getURL()), message);
	});
}