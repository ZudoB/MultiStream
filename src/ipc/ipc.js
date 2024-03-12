import { dialog, ipcMain, screen } from "electron";
import { config } from "../store/store.js";
import { moveWinToDisplay } from "../background/background.js";
import { getClientByLetter, getClients, getLeftSideUser, setLayout, setLeftSideUser, swapClients, ws } from "../app.js";


function getClientIDFromURL(url) {
	return parseInt(new URL(url).searchParams.get("__multistream_client_index"));
}

export function enableIPC(backgroundWin, configWin) {
	ipcMain.on("set-resolution", (event, {width, height, display, framerate}) => {
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

	ipcMain.on("join-room", (event, {client, room}) => {
		if (!room) return;

		const c = getClientByLetter(client);
		c.webContents.send("join-room", room);
	});

	ipcMain.on("reload-client", (event, client) => {
		const index = parseInt(client) || 0;

		const clients = getClients();

		if (index >= clients.length) {
			return dialog.showErrorBox("No such client", "You don't have enough active clients.");
		}

		clients[index].webContents.loadURL(`https://tetr.io/?__multistream_client_index=${index}`);
	});

	ipcMain.on("kill-client", async (event, client) => {
		const index = parseInt(client) || 0;

		const clients = getClients();

		if (index >= clients.length) {
			return dialog.showErrorBox("No such client", "You don't have enough active clients.");
		}

		await clients[index].webContents.loadURL(`about:blank`);
		configWin.webContents.send("client-status", {client: index, dead: true});
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

		const clients = getClients();

		if (index >= clients.length) {
			return dialog.showErrorBox("No such client", "You don't have enough active clients.");
		}

		clients[index].webContents.send("load-replay", content);
	});

	ipcMain.on("set-layout", (event, layout) => {
		setLayout(layout);
	});

	ipcMain.on("swap-clients", (event, {clientA, clientB}) => {
		swapClients(clientA, clientB);
	});

	ipcMain.on("client-status", (event, status) => {
		status.client = config.get("clientorder").indexOf(status.client); // real client index

		// pick a left side user
		const currentLeftUser = getLeftSideUser(status.client);

		if (!currentLeftUser || (currentLeftUser !== status.p1?.userid && currentLeftUser !== status.p2?.userid)) {
			setLeftSideUser(status.client, status.p1?.userid);
		}

		try {
			configWin.webContents.send("client-status", status);
		} catch {
			// chances are we're quitting, so drop
		}
	});

	ipcMain.on("get-left-side-user", (event, client) => {
		event.returnValue = getLeftSideUser(client);
	});

	ipcMain.on("set-left-side-user", (event, {client, user}) => {
		const index = parseInt(client) || 0;
		const clients = getClients();

		setLeftSideUser(client, user);
		clients[index].webContents.send("request-status");
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