import { WebSocketServer } from "ws";
import { convertLeaderboardToScore } from "./helpers.js";
import { getClients, setLayout } from "../app.js";

export class WebsocketServer {


	constructor() {
		this.wsClients = new Set();

		this.setup();
	}

	async setup() {
		await this.startServer();
		this.server.on("connection", client => {
			this.wsClients.add(client);

			client.on("message", message => {
				try {
					this.onMessage(JSON.parse(message));
				} catch (e) {
					console.error(e);
					client.close();
				}
			});

			client.on("close", () => {
				this.wsClients.delete(client);
			});
		});
	}

	broadcast(type, client, data) {
		for (const wsClient of this.wsClients.values()) {
			wsClient.send(JSON.stringify({ type, client: client, data }));
		}
	}

	onMessage(message) {
		let client;

		if (typeof message.client === "number") {
			client = getClients()[message.client];
		}

		console.log(message, client);

		switch (message.type) {
			case "client:join-room":
				client?.webContents.send("join-room", message.data);
				break;
			case "client:focus-player":
				client?.webContents.send("focus-player", message.data);
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
		} else {
			return message.items;
		}
	}

	handleRibbonSend(clientID, message) {
		// console.log(clientID, message);
	}

	handleRibbonReceive(clientID, message) {
		const messages = this.convertRibbonMessage(message);
		// todo: client id needs to be reconciled with the layout

		for (const message of messages) {
			switch (message.command) {
				case "game.ready":
					this.broadcast("game:start", clientID, { newGame: message.data.isNew });
					break;
				case "game.end":
					this.broadcast("game:end", clientID, {
						reason: "finish",
						scores: message.data.leaderboard.map(convertLeaderboardToScore)
					});
					break;
				case "game.abort":
					this.broadcast("game:end", clientID, {
						reason: "abort",
						scores: null
					});
					break;
				case "game.spectate":
					this.broadcast("game:spectate", clientID, {});
					break;
				case "game.match":
				case "game.score":
					this.broadcast("game:score", clientID, {
						ft: message.data.refereedata.ft,
						wb: message.data.refereedata.wb,
						// winner: message.data.victor,
						scores: message.data.leaderboard.map(convertLeaderboardToScore)
					});
					break;
				case "game.advance":
					this.broadcast("game:round-end", clientID, {
						scores: message.data.currentboard.map(convertLeaderboardToScore)
					});
			}
		}
	}
}