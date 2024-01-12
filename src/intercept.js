function doJSModification(text) {
    text = text.replace(`window.DEVHOOK_LOAD_REPLAY_RAW`, `window.DEVHOOK_MS_MULTILOG=t=>Qt.showMultiLog({...t,back:"home"});window.DEVHOOK_LOAD_REPLAY_RAW`);

    return text;
}

module.exports = {doJSModification};