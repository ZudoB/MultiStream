import { BrowserWindow, shell } from "electron";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

export function createConfigWindow() {
	const win = new BrowserWindow({
		width: 800,
		height: 800,
		title: "MultiStream Config",
		resizable: false,
		maximizable: false,
		show: false,
		webPreferences: {
			preload: join(__dirname, "preload.js"),
			nodeIntegration: false,
			contextIsolation: true,
			nativeWindowOpen: true
		}
	});

	win.setMenuBarVisibility(false);
	win.webContents.loadFile(join(__dirname, "index.html"));

	// handle window open by using browser
	win.webContents.setWindowOpenHandler(({url}) => {
		shell.openExternal(url);
		return {action: "deny"};
	});

	win.on("ready-to-show", () => {
		win.show();
	});

	return win;
}