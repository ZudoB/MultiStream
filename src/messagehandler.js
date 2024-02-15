const { WebSocketServer, WebSocket } = require("ws");
const {EventEmitter} = require("node:events")

module.exports = class MessageHandler extends EventEmitter {

    wss;
    layout;
    rooms;
    statuses;



    constructor(layout) {
        super()

        //create websocket server
        this.wss = new WebSocketServer({
            port: 31462
        });

        this.layout = layout;
        this.rooms = [null,null,null,null];
        this.statuses = [null,null,null,null];

        this.wss.on('connection', ws => {
            console.log("client connected");
            ws.send(JSON.stringify({
                data :{
                    message:{
                        command:'multistream.layout',
                        layout: this.layout
                    }
                }
            }));

            this.statuses.forEach((status, index) => {
                if(!status) return;
                ws.send(JSON.stringify({
                    data:{
                        index,
                        message: {
                            command: "multistream.clientstatus",
                            data: status
                        }
                    }
                }))
            })

            this.rooms.forEach((room, index) => {
                if(!room) return;
                ws.send(JSON.stringify({
                    data:{
                        index,
                        message: {
                            command: "room.update",
                            data: room
                        }
                    }
                }))
            })
            
            
        });
    
        this.wss.on("error", (error) => {
            console.log(error);
        })

    }

    broadcast (data) {
        const message = JSON.stringify({
            data
        });

        //console.log(JSON.stringify(data, null, 2))

        for(let client of this.wss.clients) {
            if (client.readyState === WebSocket.OPEN) client.send(message);
        }
    }

    handleWebSocketMessage(message) {
        /*
        todo - handle incoming websocket messages. perhaps this could control multistream?

        made this class an eventemitter, so that messageHandler.on("layout") can be used to edit the client layout, for example
        */
    }

    setLayout(layout){
        this.layout = layout;
        this.broadcast({
            message: {
                command: 'multistream.layout',
                layout: this.layout
            }
        })
    }

    swapRooms(a,b) {
        const tempRoom = this.rooms[a];
        this.rooms[a] = this.rooms[b];
        this.rooms[b] = tempRoom;

        //broadcast updated room status

        [a,b].forEach(i => {
            this.broadcast({
                index: i,
                message: {
                    command: "room.update",
                    data: this.rooms[i]
                }
            })
        })
    }

    swapStatuses(a,b) {
        const tempStatus = this.statuses[a];
        this.statuses[a] = this.statuses[b];
        this.statuses[b] = this.statuses;

        //broadcast updated room status

        [a,b].forEach(i => {
            this.broadcast({
                index: i,
                message: {
                    command: "multistream.clientstatus",
                    data: this.statuses[i]
                }
            })
        })
    }
    

    handleRibbonMessage(message, index) {
        //ribbon message handling goes here.

        switch(message.command){
            case "hello":
                for(let packet of message.packets){
                    this.handleRibbonMessage(packet, index);
                }
                break;
            case "X-MUL":
                for(let item of message.items){
                    this.handleRibbonMessage(item, index)
                }
                break;
            case "replay":
                break;
            case "room.update":
                this.rooms[index] = message.data
                this.broadcast({
                    index, message
                }) 
                break;

            case "room.leave":
                this.rooms[index] = null;
                this.broadcast({
                    index, message
                })
                break;
            case "room.join":
            case "room.update.auto":
            case "room.chat":
            case "game.ready":
                this.broadcast({
                    index, message
                })
                break;
            default:
                break;
        }
    }
}