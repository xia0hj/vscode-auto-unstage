import * as vscode from "vscode";
import path from "node:path";

class RowMarkerTreeItem extends vscode.TreeItem {
    fsPath: string;
    constructor(fsPath: string, collapsibleState?: vscode.TreeItemCollapsibleState) {
        super(path.basename(fsPath), collapsibleState);
        this.fsPath = fsPath;
    }
}

interface RowMemento extends vscode.Memento {
    get(fsPath: string): number[] | undefined
    update(key: string, value: number[]): Thenable<void>
}

export class RowMarkerManager implements vscode.TreeDataProvider<RowMarkerTreeItem> {
    private icon: vscode.TextEditorDecorationType;
    private state: RowMemento;

    constructor(ctx: vscode.ExtensionContext) {
        this.icon = vscode.window.createTextEditorDecorationType({
            light: {
                gutterIconPath: vscode.Uri.joinPath(ctx.extensionUri, "assets", "light.svg"),
                gutterIconSize: "auto",
                opacity: "0.3",
            },
            dark: {
                gutterIconPath: vscode.Uri.joinPath(ctx.extensionUri, "assets", "dark.svg"),
                gutterIconSize: "auto",
                opacity: "0.3",
            },
        });
        this.state = ctx.workspaceState;
        this.checkWorkspaceState();
    }

    private checkWorkspaceState() {
        let invalid = false;
        for (const fsPath of this.state.keys()) {
            const rows = this.state.get(fsPath);
            if (rows != undefined && !Array.isArray(rows)) {
                invalid = true;
                this.state.update(fsPath, []);
            }
        }
        if (invalid) {
            vscode.window.showWarningMessage("auto-unstage reset invalid workspace state");
        }
    }

    // #region handle rows
    public addRows(fsPath: string, start: number, end: number) {
        const set = new Set(this.getUnstageRows(fsPath));
        for (let i = start; i <= end; i++) {
            set.add(i);
        }
        this.state.update(fsPath, [...set]);
        this.refresh();
    }

    public removeRows(fsPath: string, start: number, end: number) {
        const set = new Set(this.state.get(fsPath));
        for (let i = start; i <= end; i++) {
            set.delete(i);
        }
        this.state.update(fsPath, [...set]);
        this.refresh();
    }

    public updateRowsOnTextChange(fsPath: string, change: vscode.TextDocumentContentChangeEvent) {
        const rows = this.getUnstageRows(fsPath);
        if (rows.length === 0) {
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
            }
            else {
                newRows.add(curRow);
            }
        }

        this.state.update(fsPath, [...newRows]);
        this.refresh();
    }

    public getUnstageRows(fsPath: string) {
        return this.state.get(fsPath) ?? [];
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
            const rows = this.getUnstageRows(element.fsPath).sort((a, b) => a - b);
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
            const fileNodes = [...this.state.keys()].map(
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
        const rows = this.getUnstageRows(textEditor.document.uri.fsPath);
        if (rows.length === 0) {
            return;
        }
        textEditor.setDecorations(this.icon, [...rows].map(row => textEditor.document.lineAt(row).range));

        this._onDidChangeTreeData.fire();
    }
}
