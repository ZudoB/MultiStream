function exposeObfuscatedObject(js, regexReference, usage, name) {
    const constantName = js.match(regexReference)[1];

    js = js.replace(usage, `window.MULTISTREAM_HOOKS['${name}']=${constantName};${usage}`);

    return js;
}


function doJSModification(text, index = 0) {
    text = `window.MULTISTREAM_HOOKS={};` + text;

    // expose multiplayer replay hook (among others)
    text = exposeObfuscatedObject(text, /(\w+)\.showMultiLog/, "window.DEVHOOK_LOAD_REPLAY_RAW", "game");

    // block attempts to set the max fps
    text = text.replaceAll(`PIXI.Ticker.shared.maxFPS=e`, `PIXI.Ticker.shared.redirected_maxFPS=e`);

    //websocket ribbon modification
    text = text.replace(`ws.send(SmartEncode(packet, ws.packr));`, `ws.send(SmartEncode(packet, ws.packr));wsmod.sendMessage(packet, ${index});`);
    text = text.replace(`const msg = SmartDecode(new Uint8Array(ab), this.unpackr);`, `const msg = SmartDecode(new Uint8Array(ab), this.unpackr);wsmod.receiveMessage(msg, ${index});`);
    

    return text;
}



module.exports = {doJSModification};

