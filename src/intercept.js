function doJSModification(text) {
    // add a hook to the replay loading function
    text = text.replace(`window.DEVHOOK_LOAD_REPLAY_RAW`, `window.DEVHOOK_MS_MULTILOG=t=>Qt.showMultiLog({...t,back:"home"});window.DEVHOOK_LOAD_REPLAY_RAW`);

    // block attempts to set the max fps
    text = text.replaceAll(`PIXI.Ticker.shared.maxFPS=e`, `PIXI.Ticker.shared.redirected_maxFPS=e`);

    return text;
}

module.exports = {doJSModification};