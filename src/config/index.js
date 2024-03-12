// document.querySelector("#countform").addEventListener("submit", e => {
//     e.preventDefault();
//     const fd = new FormData(e.target);
//     const count = fd.get("clients");
//     config.setCount(count) || 1;
// });

document.querySelector("#swapform").addEventListener("submit", e => {
	e.preventDefault();
	const fd = new FormData(e.target);
	const clientA = fd.get("clienta");
	const clientB = fd.get("clientb");
	config.swapClients(clientA, clientB);
})

document.querySelector("#resform").addEventListener("submit", e => {
	e.preventDefault();
	const fd = new FormData(e.target);
	const width = Math.floor(fd.get("width") / 2) * 2;
	const height = Math.floor(fd.get("height") / 2) * 2;
	config.setResolution(width, height, fd.get("display"), fd.get("framerate"));
});

document.querySelectorAll("[data-client-join]").forEach(el => {
	el.addEventListener("click", () => {
		config.joinRoom(el.dataset.clientJoin, document.querySelector("#roomcode").value.trim().toUpperCase());
	});
});

document.querySelectorAll("[data-client-reload]").forEach(el => {
	el.addEventListener("click", () => {
		config.reloadClient(el.dataset.clientReload);
	});
});

document.querySelectorAll("[data-client-kill]").forEach(el => {
	el.addEventListener("click", () => {
		config.killClient(el.dataset.clientKill);
	});
});

document.querySelectorAll("[data-client-replay]").forEach(el => {
	el.addEventListener("click", () => {
		const file = document.querySelector("input[type=file]").files[0];
		if (!file) return;

		const fr = new FileReader();

		fr.addEventListener("load", () => {
			const replay = JSON.parse(fr.result);

			config.loadReplay(el.dataset.clientReplay, replay);
		});

		fr.readAsText(file);
	});
});

document.querySelector("[name=width]").value = config.getConfig("resolution.width");
document.querySelector("[name=height]").value = config.getConfig("resolution.height");
document.querySelector("#replays-dir").innerText = config.getConfig("replaysdir");

document.querySelector("[name=css]").value = config.getConfig("css");
document.querySelector("#cssform").addEventListener("submit", e => {
	e.preventDefault();
	const fd = new FormData(e.target);

	config.setConfig("css", fd.get("css"));
});

document.querySelector("[name=css]").addEventListener("keydown", e => {
	if (e.key === "Tab") {
		e.preventDefault();
		const start = e.target.selectionStart;
		const end = e.target.selectionEnd;

		document.querySelector("[name=css]").setRangeText("\t", start, end, "end");
	}
})

document.querySelector("#replays-setdir").addEventListener("click", async () => {
	const dir = await config.selectReplayDir();
	if (dir) {
		document.querySelector("#replays-dir").innerText = dir;
	}
});

document.querySelectorAll("[data-configtoggle]").forEach(el => {
	if (config.getConfig(el.dataset.configtoggle)) {
		el.checked = true;
	}

	el.addEventListener("change", () => {
		config.setConfig(el.dataset.configtoggle, el.checked);
	});
});

document.querySelectorAll("[data-setlayout]").forEach(el => {
	if (config.getConfig("layout") === el.dataset.setlayout) {
		el.classList.add("active");
	}

	el.addEventListener("click", () => {
		document.querySelectorAll("[data-setlayout]").forEach(el => {
			el.classList.remove("active");
		});

		el.classList.add("active");

		config.setLayout(el.dataset.setlayout);
	});
});

document.querySelector("#zoom-slider").addEventListener("input", e => {
	config.setZoom(parseInt(e.target.value));
});

const screens = config.getScreens();
for (let i = 0; i < screens.length; i++) {
	const option = document.createElement("option");
	option.innerText = `${i + 1} - ${screens[i].label} (${screens[i].bounds.width} x ${screens[i].bounds.height})`;
	option.value = screens[i].id;
	document.querySelector("[name=display]").appendChild(option);
}

if (config.getConfig("resolution.display")) {
	document.querySelector("[name=display]").value = config.getConfig("resolution.display");
}

document.querySelector("[name=framerate]").value = config.getConfig("framerate");

document.querySelector("[data-configtoggle=smartlayout]").addEventListener("change", e => {
	document.querySelector("#layouts").style.display = e.target.checked ? "none" : "block";
	document.querySelector("#smartlayout-info").style.display = e.target.checked ? "block" : "none";

	// select the correct layout if disabling
	const layouts = document.querySelectorAll("[data-setlayout]");
	const layout = config.getConfig("layout");

	layouts.forEach(el => {
		if (el.dataset.setlayout === layout) {
			el.classList.add("active");
		} else {
			el.classList.remove("active");
		}
	});
});

document.querySelector("#layouts").style.display = document.querySelector("[data-configtoggle=smartlayout]").checked ? "none" : "block";
document.querySelector("#smartlayout-info").style.display = document.querySelector("[data-configtoggle=smartlayout]").checked ? "block" : "none";

document.querySelectorAll("[data-swap-left]").forEach(el => {
	el.addEventListener("click", () => {
		const client = el.dataset.swapLeft;

		config.setLeftSideUser(client, el.dataset.userid);
	});
});

config.onClientStatus(status => {
	const row = document.querySelector(`[data-client-status=${status.client}]`);

	row.querySelector("[data-client-status-item=roomid]").innerText = status.roomid || "None";
	row.querySelector("[data-client-status-item=playercount]").innerText = status.players;
	row.querySelector("[data-client-status-item=status]").innerText = status.dead ? "Dead" : (!status.roomid ? "Menus" : (status.ingame ? "In game" : "Lobby"));

	const p1 = row.querySelector("[data-client-status-item=p1]");
	const p2 = row.querySelector("[data-client-status-item=p2]");

	const currentLeftUser = config.getLeftSideUser(status.client);

	const leftUsername = currentLeftUser === status.p1?.userid ? status.p1?.username : status.p2?.username;
	const rightUsername = currentLeftUser === status.p1?.userid ? status.p2?.username : status.p1?.username;

	p1.innerText = status.p1 ? leftUsername.toUpperCase() : "";
	p2.innerText = status.p2 ? rightUsername.toUpperCase() : "";

	row.querySelector("[data-swap-left]").dataset.userid = currentLeftUser === status.p1?.userid ? status.p2?.userid : status.p1?.userid;

	// if (status.dead) {
	// 	document.querySelector(`#client${status.client}-status`).innerText = "DEAD";
	// 	return;
	// }
	//
	// console.log(status);
	//
	// if (status.roomid) {
	// 	// ${status.p1 ? ` - ${status.p1.toUpperCase()}${status.p2 ? ` and ${status.p2.toUpperCase()}` : ""}` : ""}
	// 	document.querySelector(`#client${status.client}-status`).innerText = `${status.roomid} - ${status.players} players${status.ingame ? "- INGAME" : ""}`;
	// } else {
	// 	document.querySelector(`#client${status.client}-status`).innerText = "Not in a room";
	// }
});

function disableDangerButtons(s) {
	document.querySelectorAll("[data-danger]").forEach(el => el.disabled = s);
}
window.addEventListener("keydown", e => {
	if (e.key === "Alt") {
		disableDangerButtons(false);
	}
});

window.addEventListener("keyup", e => {
	if (e.key === "Alt") {
		disableDangerButtons(true);
	}
});

window.addEventListener("blur", () => disableDangerButtons(true));
disableDangerButtons(true);