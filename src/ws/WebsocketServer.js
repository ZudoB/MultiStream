import { WebSocketServer } from "ws";
import { convertLeaderboardToScore } from "./helpers.js";
import { getClients, setLayout, setLeftSideUser } from "../app.js";
import { config } from "../store/store.js";

export class WebsocketServer {


	constructor() {
		this.wsClients = new Set();

		this.statuses = new Map();

		this.setup();
	}

	async setup() {
		await this.startServer();

		this.server.on("connection", ws => {
			this.wsClients.add(ws);

			this.send(ws, "multistream:layout", null, { layout: config.get("layout") });
			for (const [client, status] of this.statuses) {
				this.send(ws, "client:status", client, status);
			}

			ws.on("message", message => {
				try {
					this.onMessage(JSON.parse(message));
				} catch (e) {
					console.error(e);
					ws.close();
				}
			});

			ws.on("close", () => {
				this.wsClients.delete(ws);
			});
		});
	}

	send(ws, type, client, data) {
		ws.send(JSON.stringify({ type, client, data }));
	}

	broadcast(type, client, data) {
		for (const wsClient of this.wsClients.values()) {
			this.send(wsClient, type, client, data);
		}
	}

	onMessage(message) {
		let client;
		let clientLetter;

		if (typeof message.client === "number") {
			client = getClients()[message.client];
			clientLetter = config.get("clientorder").find(([ index]) => index === message.client)[0];
		} else if (typeof message.client === "string") {
			client = getClients().find(c => c.client === message.client);
			clientLetter = message.client;
		}

		switch (message.type) {
			case "room:join":
				client?.webContents.send("join-room", message.data);
				break;
			case "client:focus-player":
				client?.webContents.send("focus-player", message.data);
				break;
			case "client:set-left-user":
				setLeftSideUser(clientLetter, message.data);
				client?.webContents.send("request-status");
				break;
			case "multistream:set-layout":
				setLayout(message.data);
				break;
		}
	}

	async startServer() {
		let port = 31462;
		let ok = false;

		do {
			try {
				await this.listenOnPort(port);
				ok = true;

				console.log("Websocket server listening on port", port);
			} catch (e) {
				if (e.code === "EADDRINUSE") {
					port++;
				} else {
					throw e;
				}
			}
		} while (!ok);
	}

	listenOnPort(port) {
		return new Promise((resolve, reject) => {
			this.server = new WebSocketServer({ port });

			this.server.on("listening", () => {
				resolve();
			});

			this.server.once("error", e => {
				reject(e);
			});
		});
	}

	convertRibbonMessage(message) {
		if (message.command !== "X-MUL") {
			return [message];
		} else if (message.command === "hello") {
			return [message, ...message.packets];
		} else {
			return message.items;
		}
	}

	handleRibbonSend(clientID, message) {
		// console.log(clientID, message);
	}

	handleRibbonReceive(clientID, message) {
		const messages = this.convertRibbonMessage(message);

		const clientLetter = config.get("clientorder").find(([, index]) => index === clientID)[0];

		for (const message of messages) {
			switch (message.command) {
				case "room.join":
					this.broadcast("room:join", clientLetter, message.data);
					break;
				case "room.leave":
					this.broadcast("room:leave", clientLetter, {});
					break;
				case "game.ready":
					this.broadcast("game:start", clientLetter, { newGame: message.data.isNew });
					break;
				case "game.end":
					this.broadcast("game:end", clientLetter, {
						reason: "finish",
						scores: message.data.leaderboard.map(convertLeaderboardToScore)
					});
					break;
				case "game.abort":
					this.broadcast("game:end", clientLetter, {
						reason: "abort",
						scores: null
					});
					break;
				case "game.spectate":
					this.broadcast("game:spectate", clientLetter, {});
					break;
				case "game.match":
				case "game.score":
					this.broadcast("game:score", clientLetter, {
						ft: message.data.refereedata.ft,
						wb: message.data.refereedata.wb,
						// winner: message.data.victor,
						scores: message.data.leaderboard.map(convertLeaderboardToScore)
					});
					break;
				case "game.advance":
					this.broadcast("game:round-end", clientLetter, {
						scores: message.data.currentboard.map(convertLeaderboardToScore)
					});
			}
		}
	}

	handleClientStatus(status) {
		this.statuses.set(status.client, status);
		this.broadcast("client:status", status.client, status);
	}
}