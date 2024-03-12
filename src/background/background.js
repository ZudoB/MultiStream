import { BrowserWindow, screen } from "electron";
import { join, dirname } from "path";
import { config } from "../store/store.js";
import { fileURLToPath } from "url";

import packageJson from "../../package.json" assert {type: "json"};

const __dirname = dirname(fileURLToPath(import.meta.url));

const version = packageJson.version;

export function moveWinToDisplay(window, display, width, height) {
	window.setResizable(true);

	const chosenDisplay = screen.getAllDisplays().find(d => d.id === parseInt(display));

	if (chosenDisplay) {
		window.setBounds(chosenDisplay.bounds);
	}

	window.setSize(width, height);
	window.setResizable(false);
	window.center();
}

export function createBackgroundWindow() {
	const win = new BrowserWindow({
		useContentSize: true,
		resizable: false,
		maximizable: false,
		minimizable: false,
		closable: false,
		transparent: true,
		title: `MultiStream v${version}`,
		center: true,
		frame: config.get("frame"),
		show: false
	});


	win.setMenu(null);
	win.webContents.loadFile(join(__dirname, "index.html"));

	moveWinToDisplay(win, config.get("resolution.display"), config.get("resolution.width"), config.get("resolution.height"));

	return win;
}