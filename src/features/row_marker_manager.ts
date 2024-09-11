import * as vscode from "vscode";

const WHITESPACE_REGEX = new RegExp(/^\s*$/g);

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

    public updateRowsOnTextChange(fsPath: string, document: vscode.TextDocument, change: vscode.TextDocumentContentChangeEvent) {
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
            if (curRow >= change.range.end.line) {
                const curRowText = document.lineAt(curRow).text;

                // 修改后原来那一行变成空白字符，说明是在代码前面插入了换行
                if (WHITESPACE_REGEX.test(curRowText)) {
                    newRows.add(curRow + changeLines);
                }
                // 修改后原来那一行不是空白字符，说明是在代码后面插入了换行
                else {
                    newRows.add(curRow);
                }
            }
            else {
                newRows.add(curRow);
            }
        }

        this._map.set(fsPath, newRows);
        this._updateIcon();
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
