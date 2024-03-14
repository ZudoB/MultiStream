import Store from "electron-store";
import { app } from "electron";
import { join } from "path";

export const config = new Store({
	defaults: {
		layout: "1x1",
		clientorder: [
			["a", 0],
			["b", 1],
			["c", 2],
			["d", 3]
		],
		smartlayout: false,
		resolution: {
			width: 1920, height: 1080, display: undefined
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
	},

	migrations: {
		"2.0.0": store => {
			// reset clientorder
			store.reset("clientorder");
		}
	}
});

// TODO: temporarily disable smartlayout
config.set("smartlayout", false);