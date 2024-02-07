const { WebSocketServer, WebSocket } = require("ws");
const {EventEmitter} = require("node:events")

module.exports = class MessageHandler extends EventEmitter {

    wss;
    layout;



    constructor(layout) {
        super()

        //create websocket server
        this.wss = new WebSocketServer({
            port: 31462
        });

        this.layout = layout;
    
        this.wss.on('connection', ws => {
            console.log("client connected");
            ws.send(JSON.stringify({
                data :{
                    message:{
                        command:'multistream.layout',
                        layout: this.layout
                    }
                }
            }))
            
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
            message: 'multistream.layout',
            layout: this.layout
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
            case "room.join":
            case "room.update":
            case "room.leave":
                this.broadcast({
                    index, message
                })
                break;
            default:
                break;
        }
    }
}