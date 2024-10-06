import * as vscode from "vscode";
import { expect, test } from "vitest";
import { RowMarkerManager } from "@src/row_marker_manager";
import { GitExtension } from "@src/repository_watcher/git";
import { RepositoryWatcher } from "@src/repository_watcher";

export function activate(ctx: vscode.ExtensionContext) {
    const gitExtensionApi = vscode.extensions.getExtension<GitExtension>("vscode.git")?.exports?.getAPI(1);
    if (gitExtensionApi == undefined) {
        console.warn("Extension vscode.auto-unstage failed to activate, can not found dependency vscode.git.");
        return false;
    }

    // #region init RowMarkerManager
    const rowMarkerManager = new RowMarkerManager(ctx);
    vscode.window.registerTreeDataProvider("auto-unstage.explorer", rowMarkerManager);
    ctx.subscriptions.push(
        vscode.commands.registerTextEditorCommand("auto-unstage.addSelectedRows", (textEditor) => {
            rowMarkerManager.addRows(
                textEditor.document.uri.fsPath,
                textEditor.selection.start.line,
                textEditor.selection.end.line,
            );
        }),
        vscode.commands.registerTextEditorCommand("auto-unstage.removeSelectedRows", (textEditor) => {
            rowMarkerManager.removeRows(
                textEditor.document.uri.fsPath,
                textEditor.selection.start.line,
                textEditor.selection.end.line,
            );
        }),

        vscode.workspace.onDidChangeTextDocument((event) => {
            const fsPath = event.document.uri.fsPath;
            event.contentChanges.forEach((change) => {
                rowMarkerManager.updateRowsOnTextChange(fsPath, change);
            });
        }),
    );
    // #endregion

    // #region init RepositoryWatcher
    const watcherMap = new Map<string, RepositoryWatcher>();
    ctx.subscriptions.push(
        gitExtensionApi.onDidOpenRepository(
            (repository) => {
                const repositoryWatcher = new RepositoryWatcher(
                    repository,
                    fsPath => rowMarkerManager.getUnstageRows(fsPath),
                );
                ctx.subscriptions.push(repositoryWatcher);
                watcherMap.set(repository.rootUri.toString(), repositoryWatcher);
            },
        ),
        gitExtensionApi.onDidCloseRepository((repository) => {
            watcherMap.get(repository.rootUri.toString())?.dispose();
        }),
    );
    // #endregion

    vscode.window.showInformationMessage("Extension vscode.auto-unstage activate successfully !!!");
}

export function deactivate() {}

if (import.meta.vitest) {
    test("vitest example", () => {
        expect(1).toBe(1);
    });
}
