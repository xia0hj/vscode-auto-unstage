import * as vscode from "vscode";
import { expect, test } from "vitest";

export function activate() {
    vscode.window.showInformationMessage("Hello");
}

export function deactivate() {}

if (import.meta.vitest) {
    test("vitest example", () => {
        expect("1").toBe("1");
    });
}
