const {ipcRenderer} = require("electron/renderer");

(async () => {
    const getConfig = key => ipcRenderer.sendSync("get-config", key);

    ipcRenderer.on("join-room", (e, room) => {
        console.log(e, room);
        window.DEVHOOK_FAST_JOIN_ROOM(room);
    });

    let wasLastVictoryScreenVisible = false;
    const autoDownloadObserver = new MutationObserver(() => {
        const isVisible = !document.getElementById("victoryview").classList.contains("hidden");

        if (!isVisible) {
            wasLastVictoryScreenVisible = false;
            return;
        }

        if (isVisible && !wasLastVictoryScreenVisible && getConfig("savereplays")) {
            wasLastVictoryScreenVisible = true;
            document.getElementById("victory_downloadreplay").click();
        }
    });


    if (window.location.hostname !== "tetr.io") {
        return;
    }

    function awaitSomething(predicate, callback) {
        let int = setInterval(() => {
            if (!predicate()) return;
            clearInterval(int)
            callback();
        }, 10);
    }

    const CONFIG = {
        "controls": {
            "style": "guideline",
            "custom": {
                "moveLeft": [],
                "moveRight": [],
                "softDrop": [],
                "hardDrop": [],
                "rotateCCW": [],
                "rotateCW": [],
                "rotate180": [],
                "hold": [],
                "exit": [],
                "retry": [],
                "chat": [],
                "target1": [],
                "target2": [],
                "target3": [],
                "target4": [],
                "menuUp": [],
                "menuDown": [],
                "menuLeft": [],
                "menuRight": [],
                "menuBack": [],
                "menuConfirm": [],
                "openSocial": []
            },
            "sensitivity": 0.5,
            "vibration": 1
        },
        "handling": {"arr": 2, "das": 10, "dcd": 0, "sdf": 6, "safelock": true, "cancel": false},
        "volume": {"music": 0, "sfx": 0, "stereo": 0.5},
        "video": {
            "graphics": "high",
            "caching": "medium",
            "actiontext": "all",
            "particles": 0.6,
            "background": 1,
            "bounciness": 1,
            "shakiness": 1,
            "gridopacity": 0.1,
            "boardopacity": 0.85,
            "shadowopacity": 0.15,
            "zoom": 1,
            "alwaystiny": false,
            "nosuperlobbyanim": false,
            "colorshadow": false,
            "sidebyside": true,
            "spin": true,
            "chatfilter": true,
            "background_url": null,
            "background_usecustom": null,
            "nochat": true,
            "hideroomids": true,
            "emotes": true,
            "emotes_anim": true,
            "siren": true,
            "powersave": false,
            "invert": false,
            "nobg": true,
            "chatbg": true,
            "replaytoolsnocollapse": false,
            "kos": true,
            "fire": true,
            "focuswarning": false,
            "hidenetwork": false,
            "guide": false,
            "lowrescounters": false,
            "desktopnotifications": false,
            "lowres": false,
            "webgl": "webgl2",
            "bloom": 1,
            "chroma": 0.5,
            "flashwave": 1
        },
        "gameoptions": {
            "pro_40l": false,
            "pro_40l_alert": false,
            "pro_40l_retry": false,
            "stride_40l": false,
            "pro_blitz": false,
            "pro_blitz_alert": false,
            "pro_blitz_retry": false,
            "stride_blitz": false
        },
        "electron": {"loginskip": "always", "adblock": true},
        "notifications": {
            "suppress": false,
            "forcesound": false,
            "online": "off",
            "offline": "off",
            "dm": "off",
            "dm_pending": "off",
            "invite": "ingame",
            "other": "ingame"
        }
    };

    // window.IS_ELECTRON = true;
    // window.CLIENT_VERSION = "UNSUPPORTED";
    // window.IPC = {
    //     on() {
    //     }, off() {
    //     }, send() {
    //     }
    // }

    awaitSomething(() => "PIXI" in window, () => {
        window.PIXI.Application = new Proxy(window.PIXI.Application, {
            construct(target, args) {
                args[0].transparent = true;
                return new target(...args);
            }
        });
    });

    if (getConfig("nospecbar")) {
        awaitSomething(() => document.getElementById("menus") && !document.getElementById("menus").classList.contains("hidden"), () => {
            window.DEVHOOK_DISABLE_SPECTATOR_TOOLS();
        });
    }

    if (getConfig("transparent")) {
        window.Image = new Proxy(window.Image, {
            construct(target, args) {
                let val = new target(...args);

                awaitSomething(() => val.src !== "", () => {
                    let backgroundURL = /\/res\/bg\/(\d+).jpg/.exec(val.src);
                    if (backgroundURL) {
                        val.src = `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJ` +
                            `AAAABmJLR0QAAAAAAAD5Q7t/AAAACXBIWXMAAA7DAAAOwwHHb6hkAAAAB3RJTUUH5A` +
                            `QWBjQ7z1871gAAAAtJREFUCNdjYAACAAAFAAHiJgWbAAAAAElFTkSuQmCC`;

                    }
                });

                return val;
            }
        })
    }

    if (getConfig("skiplogin")) {
        awaitSomething(() => document.getElementById("entry_form") && !document.getElementById("entry_form").classList.contains("hidden"), () => {
            document.getElementById("entry_button").click();
        });
    }


    // if (!localStorage.getItem("userConfig")) {
    localStorage.setItem("userConfig", JSON.stringify(CONFIG));
    // }

    window.onload = () => {
        if (getConfig("transparent")) document.documentElement.style.backgroundColor = "transparent";
        document.getElementById("multi_league").style.display = "none"; // prevent silliness
        document.body.classList.add("no_login_ceriad", "ceriad_disabled", "ceriad_exempt");
        autoDownloadObserver.observe(document.getElementById("victoryview"), {
            attributes: true,
            attributeFilter: ["class"]
        });
    }


})();
