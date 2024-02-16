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
    text = `window.MULTISTREAM_HOOKS={};` + text;

    // expose multiplayer replay hook (among others)
    text = exposeObfuscatedObject(text, /(\w+)\.showMultiLog/, "window.DEVHOOK_LOAD_REPLAY_RAW", "game");

    // block attempts to set the max fps
    text = text.replaceAll(`PIXI.Ticker.shared.maxFPS=e`, `PIXI.Ticker.shared.redirected_maxFPS=e`);

    return text;
}
