import * as vscode from "vscode";
import path from "node:path";
import { readExtensionConfig } from "@src/utils";

type RowMarkerTreeItemParams = {
    isLeaf: false
    label: string
    fsPath: string
    collapsibleState?: vscode.TreeItemCollapsibleState
} | {
    isLeaf: true
    label: string
    fsPath: string
    start: number
    end: number
    collapsibleState?: vscode.TreeItemCollapsibleState
};
class RowMarkerTreeItem extends vscode.TreeItem {
    fsPath: string;
    isLeaf: boolean;
    start?: number;
    end?: number;

    /**
     * navigate to document when select tree item
     */
    command: vscode.Command = {
        command: "auto-unstage.navigateByItem",
        title: "goto",
        arguments: [this],
    };

    /**
     * context menu btn will trigger command auto-unstage.removeTreeItem
     */
    contextValue = "auto-unstage.removeTreeItem";

    constructor(params: RowMarkerTreeItemParams) {
        super(params.label, params.collapsibleState);
        this.fsPath = params.fsPath;
        this.isLeaf = params.isLeaf;

        if (params.isLeaf) {
            this.start = params.start;
            this.end = params.end;
        }
    }
}

interface RowMemento extends vscode.Memento {
    get(fsPath: string): number[] | undefined
    update(key: string, value: number[]): Thenable<void>
}

export class RowMarkerManager implements vscode.TreeDataProvider<RowMarkerTreeItem> {
    private icon!: vscode.TextEditorDecorationType;
    private state: RowMemento;

    constructor(ctx: vscode.ExtensionContext) {
        this.state = ctx.workspaceState;
        checkWorkspaceState(ctx.workspaceState);
        this.updateIcon(ctx);
        this.refresh();
    }

    public updateIcon(ctx: vscode.ExtensionContext) {
        const config = readExtensionConfig();
        this.icon = vscode.window.createTextEditorDecorationType({
            light: {
                gutterIconPath: vscode.Uri.joinPath(ctx.extensionUri, "assets", "light.svg"),
                gutterIconSize: "auto",
                opacity: String(config.opacity),
            },
            dark: {
                gutterIconPath: vscode.Uri.joinPath(ctx.extensionUri, "assets", "dark.svg"),
                gutterIconSize: "auto",
                opacity: String(config.opacity),
            },
        });
    }

    // #region handle rows
    public addRows(fsPath: string, start: number, end: number) {
        const set = new Set(this.getUnstageRows(fsPath));
        for (let i = start; i <= end; i++) {
            set.add(i);
        }
        this.state.update(fsPath, [...set]);
    }

    public removeRows(fsPath: string, start: number, end: number) {
        const set = new Set(this.getUnstageRows(fsPath));
        for (let i = start; i <= end; i++) {
            set.delete(i);
        }
        this.state.update(fsPath, [...set]);
    }

    public removeRowsByItem(item: RowMarkerTreeItem) {
        if (item.isLeaf) {
            this.removeRows(item.fsPath, item.start!, item.end!);
        }
        else {
            this.state.update(item.fsPath, []);
        }
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
        // return row item
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
            const rowItems = mergedRanges.map(({ start, end }) => {
                const label = start === end
                    ? `${start + 1}`
                    : `${start + 1} ~ ${end + 1}`;
                return new RowMarkerTreeItem({
                    isLeaf: true,
                    label,
                    fsPath: element.fsPath,
                    collapsibleState: vscode.TreeItemCollapsibleState.None,
                    start,
                    end,
                });
            });
            return Promise.resolve(rowItems);
        }
        // return file item
        else {
            const fileItems = [...this.state.keys()]
                .filter(fsPath => this.getUnstageRows(fsPath).length > 0)
                .map(
                    fsPath => new RowMarkerTreeItem({
                        isLeaf: false,
                        label: path.basename(fsPath),
                        fsPath,
                        collapsibleState: vscode.TreeItemCollapsibleState.Collapsed,
                    }),
                );
            return Promise.resolve(fileItems);
        }
    }

    public async openDocumentByItem(item: RowMarkerTreeItem) {
        const doc = await vscode.workspace.openTextDocument(item.fsPath);
        const editor = await vscode.window.showTextDocument(doc);
        if (!item.isLeaf) {
            return;
        }

        const selection = new vscode.Selection(
            new vscode.Position(item.start!, 0),
            doc.lineAt(item.end!).range.end,
        );
        editor.selection = selection;
        editor.revealRange(selection);
    }

    // #endregion

    public refresh() {
        const textEditor = vscode.window.activeTextEditor;
        if (!textEditor) {
            return;
        }
        const rows = this.getUnstageRows(textEditor.document.uri.fsPath);
        textEditor.setDecorations(
            this.icon,
            rows
                .filter(row => row < textEditor.document.lineCount)
                .map(row => textEditor.document.lineAt(row).range),
        );

        this._onDidChangeTreeData.fire();
    }
}

function checkWorkspaceState(state: RowMemento) {
    let invalid = false;
    for (const fsPath of state.keys()) {
        const rows = state.get(fsPath);
        if (rows != undefined && !Array.isArray(rows)) {
            invalid = true;
            state.update(fsPath, []);
        }
    }
    if (invalid) {
        vscode.window.showWarningMessage("[Auto Unstage] reset invalid workspace state");
    }
}
