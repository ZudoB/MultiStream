import { BrowserView, net } from "electron";
import { dirname, join } from "path";
import { doJSModification } from "./intercept.js";
import { config } from "../store/store.js";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

export function createClient(index) {
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



	function setSize(x, y, width, height) {

	}

	return view;
}