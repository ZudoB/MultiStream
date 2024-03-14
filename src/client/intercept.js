/**
 * Expose an obfuscated object to the world outside tetrio.js
 * @param js - the original javascript
 * @param regexReference - a regex, referencing a place where this function is called
 * @param usage - where to expose the object
 * @param name - the name of the object
 * @returns {string} - the modified javascript
 */
function exposeObfuscatedObject(js, regexReference, usage, name) {
    const constantName = js.match(regexReference)[1];

    js = js.replace(usage, `window.MULTISTREAM_HOOKS['${name}']=${constantName};${usage}`);

    return js;
}


export function doJSModification(text) {
    // expose multiplayer replay hook (among others)
    text = exposeObfuscatedObject(text, /(\w+)\.showMultiLog/, "window.DEVHOOK_LOAD_REPLAY_RAW", "game");

    // block attempts to set the max fps
    text = text.replaceAll(`PIXI.Ticker.shared.maxFPS=e`, `PIXI.Ticker.shared.redirected_maxFPS=e`);

    // force player order
    text = text.replaceAll(`this._ready=this._Load(t)`, `t = MULTISTREAM_HOOKS.reorderPlayers(t), this._ready = this._Load(t)`); // board order
    text = text.replaceAll(`_e(s.refereedata,s.leaderboard)`, `_e(s.refereedata,MULTISTREAM_HOOKS.reorderLeaderboard(s.leaderboard))`); // referee layout
    text = text.replaceAll(`be(e,t,s)`, `be(e,MULTISTREAM_HOOKS.reorderLeaderboard(t),s)`); // scoreslide layout

    // websocket shit
    text = text.replace(`ws.send(SmartEncode(packet, ws.packr));`, `ws.send(SmartEncode(packet, ws.packr));multistream_ribbonIPC.handleSend(packet);`);
    text = text.replace(`const msg = SmartDecode(new Uint8Array(ab), this.unpackr);`, `const msg = SmartDecode(new Uint8Array(ab), this.unpackr);multistream_ribbonIPC.handleReceive(msg);`);

    return text;
}
