export default {
    packagerConfig: {
        asar: true,
        ignore: [".idea"]
    },
    rebuildConfig: {},
    makers: [
        {
            name: "@electron-forge/maker-zip"
        }
    ],
    plugins: [
        {
            name: "@electron-forge/plugin-auto-unpack-natives",
            config: {},
        }
    ],
    publishers: [
        {
            name: "@electron-forge/publisher-github",
            config: {
                repository: {
                    owner: "ZudoB",
                    name: "MultiStream"
                },
                draft: true
            }
        }
    ]
};
