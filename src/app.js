import { app, dialog } from "electron";
import { createBackgroundWindow } from "./background/background.js";
import { createConfigWindow } from "./config/config.js";
import { enableIPC } from "./ipc/ipc.js";
import { createClient } from "./client/client.js";
import { config } from "./store/store.js";
import { LAYOUTS } from "./constants/layouts.js";
import { WebsocketServer } from "./ws/WebsocketServer.js";

app.commandLine.appendSwitch("--disable-gpu-sandbox");
app.commandLine.appendSwitch("--enable-webgl2-compute-context");
app.commandLine.appendSwitch("--lang", "en-US");
app.commandLine.appendSwitch("--no-sandbox");
app.commandLine.appendSwitch("--force-discrete-gpu", "1");
app.commandLine.appendSwitch("--enable-high-resolution-time");
app.commandLine.appendSwitch("--enable-zero-copy");
app.commandLine.appendSwitch("--ignore-gpu-blacklist");
app.commandLine.appendSwitch("--autoplay-policy", "no-user-gesture-required");

let backgroundWin;
let configWin;

let quitting = false;

const baseClients = []; // FIXED index

export const ws = new WebsocketServer();

export function getClients() {
	return baseClients;
}

export function getClientByLetter(letter) {
	const client = new Map(config.get("clientorder")).get(letter);
	return baseClients[client];
}

function setClientSize(view, x, y, width, height) {
	try {
		const [w, h] = backgroundWin.getContentSize();

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
	} catch {
		// pass
	}
}

function createClients() {
	for (let i = 0; i < 4; i++) {
		const view = createClient(i);
		setClientSize(view, i % 2, Math.floor(i / 2), 1, 1);
		backgroundWin.addBrowserView(view);
		baseClients[i] = view;
	}
}


export function applyLayout() {
	const layoutData = LAYOUTS[config.get("layout")];

	if (!layoutData) return;

	for (const view of baseClients) {
		view.setBounds({ x: 0, y: 0, width: 0, height: 0 });
	}

	for (const layout in layoutData) {
		if (!layoutData.hasOwnProperty(layout)) continue;
		console.log(layoutData[layout]);
		setClientSize(getClientByLetter(layout), ...layoutData[layout]);
	}

	// for (let i = 0; i < layoutData.length; i++) {
	// 	if (!baseClients[i]) break;
	//
	// 	setClientSize(baseClients[i], ...layoutData[i]);
	// }

	ws.broadcast("multistream:layout", null, { layout: config.get("layout") });
}

export function setLayout(layout) {
	if (!LAYOUTS[layout]) return;
	config.set("layout", layout);
	applyLayout();
}

export function setClientOrder(order) {
	config.set("clientorder", order);
	applyLayout();
}

export function swapClients(clientA, clientB) {
	const order = config.get("clientorder");

	const indexA = order.findIndex(([letter]) => letter === clientA);
	const indexB = order.findIndex(([letter]) => letter === clientB);

	const temp = order[indexA][1];
	order[indexA][1] = order[indexB][1];
	order[indexB][1] = temp;

	console.log(order);

	setClientOrder(order);
}


const clientsInGame = new Set();

const leftSideUsers = new Map();

export function setLeftSideUser(client, user) {
	leftSideUsers.set(client, user);
}

export function getLeftSideUser(client) {
	// console.log(leftSideUsers);
	return leftSideUsers.get(client);
}

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
	backgroundWin = createBackgroundWindow();
	configWin = createConfigWindow();

	enableIPC(backgroundWin, configWin, []);

	backgroundWin.on("close", event => {
		if (!quitting) event.preventDefault();
	});

	backgroundWin.on("ready-to-show", () => {
		backgroundWin.show();
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
			backgroundWin.setClosable(true);
			for (const view of clients) {
				backgroundWin.removeBrowserView(view);
			}
			backgroundWin.close();
			app.quit();
		}
	});

	createClients();
	applyLayout();
}

app.whenReady().then(() => {
	if (!app.requestSingleInstanceLock()) {
		app.quit();
	} else {
		setup();
	}
});