function doJSModification(text, index = 0) {
    // add a hook to the replay loading function
    text = text.replace(`window.DEVHOOK_LOAD_REPLAY_RAW`, `window.DEVHOOK_MS_MULTILOG=t=>Qt.showMultiLog({...t,back:"home"});window.DEVHOOK_LOAD_REPLAY_RAW`);

    // block attempts to set the max fps
    text = text.replaceAll(`PIXI.Ticker.shared.maxFPS=e`, `PIXI.Ticker.shared.redirected_maxFPS=e`);


    //websocket ribbon modification
    text = text.replace(`ws.send(SmartEncode(packet, ws.packr));`, `ws.send(SmartEncode(packet, ws.packr));wsmod.sendMessage(packet, ${index});`);
    text = text.replace(`const msg = SmartDecode(new Uint8Array(ab), this.unpackr);`, `const msg = SmartDecode(new Uint8Array(ab), this.unpackr);wsmod.receiveMessage(msg, ${index});`);
    

    return text;
}

module.exports = {doJSModification};