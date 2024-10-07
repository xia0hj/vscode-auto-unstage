import * as vscode from "vscode";

export function readExtensionConfig() {
    const configGetter = vscode.workspace.getConfiguration("auto-unstage");

    const extensionConfig = {
        opacity: configGetter.get<number>("opacity"),
    };

    console.log("[Auto Unstage] read config: ", extensionConfig);

    return extensionConfig;
}
