import * as vscode from "vscode";
import { expect, test } from "vitest";
import { RowMarkerManager } from "@src/features/row_marker_manager";

export function activate() {
    vscode.window.showInformationMessage("Hello");

    const rowMarkerManager = new RowMarkerManager();

    vscode.commands.registerTextEditorCommand("auto-unstage.markSelectedRows", (textEditor) => {
        rowMarkerManager.markSelectedRows({
            fsPath: textEditor.document.uri.fsPath,
            start: textEditor.selection.start.line,
            end: textEditor.selection.end.line,
        });
        console.log(rowMarkerManager.rowMarkers.get(textEditor.document.uri.fsPath));
    });
}

export function deactivate() {}

if (import.meta.vitest) {
    test("vitest example", () => {
        expect("1").toBe("1");
    });
}
