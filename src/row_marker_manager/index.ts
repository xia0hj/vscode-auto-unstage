import * as vscode from "vscode";
import path from "node:path";

const WHITESPACE_REGEX = new RegExp(/^\s*$/g);

class RowMarkerTreeItem extends vscode.TreeItem {
    fsPath: string;
    constructor(fsPath: string, collapsibleState?: vscode.TreeItemCollapsibleState) {
        super(path.basename(fsPath), collapsibleState);
        this.fsPath = fsPath;
    }
}

export class RowMarkerManager implements vscode.TreeDataProvider<RowMarkerTreeItem> {
    private _map: Map<string, Set<number>> = new Map();
    private icon: vscode.TextEditorDecorationType;

    constructor(extensionUri: vscode.Uri) {
        this.icon = vscode.window.createTextEditorDecorationType({
            light: {
                gutterIconPath: vscode.Uri.joinPath(extensionUri, "assets", "light.svg"),
                gutterIconSize: "auto",
                opacity: "0.3",
            },
            dark: {
                gutterIconPath: vscode.Uri.joinPath(extensionUri, "assets", "dark.svg"),
                gutterIconSize: "auto",
                opacity: "0.3",
            },
        });
    }

    // #region handle rows
    public addRows(fsPath: string, start: number, end: number) {
        let rows = this._map.get(fsPath);
        if (!rows) {
            rows = new Set<number>();
            this._map.set(fsPath, rows);
        }
        for (let i = start; i <= end; i++) {
            rows.add(i);
        }
        this.refresh();
    }

    public removeRows(fsPath: string, start: number, end: number) {
        let rows = this._map.get(fsPath);
        if (!rows) {
            rows = new Set<number>();
            this._map.set(fsPath, rows);
        }
        for (let i = start; i <= end; i++) {
            rows.delete(i);
        }
        this.refresh();
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
                newRows.add(curRow + changeLines);
            } else {
                newRows.add(curRow);
            }
        }

        this._map.set(fsPath, newRows);
        this.refresh();

        const d = [...newRows].sort((a, b) => a - b);
        console.log({
            fsPath,
            start: d[0],
            end: d[-1],
        });
    }

    public getUnstageRows(fsPath: string) {
        return new Set(this._map.get(fsPath));
    }
    // #endregion

    // #region tree view
    private _onDidChangeTreeData = new vscode.EventEmitter<RowMarkerTreeItem | undefined | null | void>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    getTreeItem(element: RowMarkerTreeItem): vscode.TreeItem | Thenable<vscode.TreeItem> {
        return element;
    }

    getChildren(element?: RowMarkerTreeItem | undefined): vscode.ProviderResult<RowMarkerTreeItem[]> {
        // return row node
        if (element) {
            const rows = [...this._map.get(element.fsPath) ?? []].sort((a, b) => a - b);
            const mergedRanges: Array<{ start: number, end: number }> = [];
            for (const row of rows) {
                const lastRange = mergedRanges.at(-1);
                if (lastRange && row === lastRange.end + 1) {
                    lastRange.end = row;
                }
                else {
                    mergedRanges.push({ start: row, end: row });
                }
            }
            const rowNodes = mergedRanges.map(({ start, end }) => {
                const rangeLabel = start === end
                    ? `${start + 1}`
                    : `${start + 1} ~ ${end + 1}`;
                return new RowMarkerTreeItem(rangeLabel, vscode.TreeItemCollapsibleState.None);
            });
            return Promise.resolve(rowNodes);
        }
        // return file node
        else {
            const fileNodes = [...this._map.keys()].map(
                fsPath => new RowMarkerTreeItem(fsPath, vscode.TreeItemCollapsibleState.Collapsed),
            );
            return Promise.resolve(fileNodes);
        }
    }
    // #endregion

    public refresh() {
        const textEditor = vscode.window.activeTextEditor;
        if (!textEditor) {
            return;
        }
        const rows = this._map.get(textEditor.document.uri.fsPath);
        if (!rows) {
            return;
        }
        textEditor.setDecorations(this.icon, [...rows].map(row => textEditor.document.lineAt(row).range));

        this._onDidChangeTreeData.fire();
    }
}
