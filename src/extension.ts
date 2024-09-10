import * as vscode from "vscode";
import { expect, test } from "vitest";
import { RowMarkerManager } from "@src/features/row_marker_manager";

export function activate() {
    const rowMarkerManager = new RowMarkerManager();

    vscode.commands.registerTextEditorCommand("auto-unstage.addSelectedRows", (textEditor) => {
        rowMarkerManager.addRows(textEditor.document.uri.fsPath, textEditor.selection);
    });

    vscode.workspace.onDidChangeTextDocument((event) => {
        const fsPath = event.document.uri.fsPath;
        event.contentChanges.forEach((change) => {

            if(change.text.includes('\n')) {
                console.log(`change=${change.range.start.line + 1}, ${change.range.end.line + 1},  text=${JSON.stringify(change.text)}, offset=${change.rangeOffset},   line=${JSON.stringify(event.document.lineAt(change.range.start.line).text)}`);
            }

            

            rowMarkerManager.updateRowsOnTextChange(fsPath, change);
        });
        console.log("-----------------");
    });

    
    
    vscode.window.showInformationMessage("插件启动成功");
}

export function deactivate() {}

if (import.meta.vitest) {
    test("vitest example", () => {
        expect("1").toBe("1");
    });
}
