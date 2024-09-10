import * as vscode from "vscode";

export class RowMarkerManager {
    _map: Map<string, Set<number>> = new Map();

    icon = vscode.window.createTextEditorDecorationType({
        gutterIconPath: "C:\\my_workspace\\my_project\\vscode-auto-unstage\\src\\features\\icon.svg",
        gutterIconSize: "contain",
    });

    public addRows(fsPath: string, selection: vscode.Selection) {
        let rows = this._map.get(fsPath);
        if (!rows) {
            rows = new Set<number>();
            this._map.set(fsPath, rows);
        }
        for (let i = selection.start.line; i <= selection.end.line; i++) {
            rows.add(i);
        }
        this._updateIcon();
    }

    public updateRowsOnTextChange(fsPath: string, change: vscode.TextDocumentContentChangeEvent) {
        const rows = this._map.get(fsPath);
        if (!rows) {
            return;
        }

        const oldLines = change.range.end.line - change.range.start.line;
        let newLines = 0;
        for (const c of change.text) {
            if (c === "\n") {
                newLines++;
            }
        }
        const changeLines = newLines - oldLines;
        if (changeLines === 0) {
            return;
        }

        const newRows = new Set<number>();
        for (const curRow of rows) {
            if (curRow <= change.range.end.line) {
                newRows.add(curRow);
            }
            else {
                newRows.add(curRow + changeLines);
                console.log(`原${curRow + 1}变成了${curRow + changeLines + 1}`);
            }
        }

        this._map.set(fsPath, newRows);
    }

    private _updateIcon() {
        const textEditor = vscode.window.activeTextEditor;
        if (!textEditor) {
            return;
        }
        const rows = this._map.get(textEditor.document.uri.fsPath);
        if (!rows) {
            return;
        }
        textEditor.setDecorations(this.icon, [...rows].map(row => new vscode.Range(row, 0, row, 0)));
    }
}

const whitespaceRegex = new RegExp(/\s/g);
function isStartWithNewline(str: string) {
    for (const c of str) {
        if (c === "\n") {
            return true;
        }
        if (!whitespaceRegex.test(c)) {
            return false;
        }
    }
    return false;
}
