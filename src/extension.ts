import * as vscode from "vscode";
import { expect, test } from "vitest";
import { RowMarkerManager } from "@src/row_marker_manager";
import { GitExtension, Repository } from "@src/repository_watcher/git";
import { RepositoryWatcher } from "@src/repository_watcher";
import path from "node:path";

export function activate(ctx: vscode.ExtensionContext) {
    const gitExtensionApi = vscode.extensions.getExtension<GitExtension>("vscode.git")?.exports?.getAPI(1);
    if (gitExtensionApi == undefined) {
        console.warn("[Auto Unstage] failed to activate, can not found dependency vscode.git.");
        return false;
    }

    // #region init RowMarkerManager
    const rowMarkerManager = new RowMarkerManager(ctx);
    vscode.window.registerTreeDataProvider("auto-unstage.explorer", rowMarkerManager);
    ctx.subscriptions.push(

        // add selected rows
        vscode.commands.registerTextEditorCommand("auto-unstage.addSelectedRows", (textEditor) => {
            rowMarkerManager.addRows(
                textEditor.document.uri.fsPath,
                textEditor.selection.start.line,
                textEditor.selection.end.line,
            );
            rowMarkerManager.refresh();
        }),

        // remove selected rows
        vscode.commands.registerTextEditorCommand("auto-unstage.removeSelectedRows", (textEditor) => {
            rowMarkerManager.removeRows(
                textEditor.document.uri.fsPath,
                textEditor.selection.start.line,
                textEditor.selection.end.line,
            );
            rowMarkerManager.refresh();
        }),

        // update row number when edit document content
        vscode.workspace.onDidChangeTextDocument((event) => {
            const fsPath = event.document.uri.fsPath;
            event.contentChanges.forEach((change) => {
                rowMarkerManager.updateRowsOnTextChange(fsPath, change);
            });
            rowMarkerManager.refresh();
        }),

        // add row from gutter context menu btn
        vscode.commands.registerCommand(
            "auto-unstage.addRowFromGutter",
            ({ lineNumber, uri }: { lineNumber: number, uri: vscode.Uri }) => {
                // lineNumber is strat from 1
                rowMarkerManager.addRows(
                    uri.fsPath,
                    lineNumber - 1,
                    lineNumber - 1,
                );
                rowMarkerManager.refresh();
            },
        ),

        // remove row from gutter context menu btn
        vscode.commands.registerCommand(
            "auto-unstage.removeRowFromGutter",
            ({ lineNumber, uri }: { lineNumber: number, uri: vscode.Uri }) => {
                // lineNumber is strat from 1
                rowMarkerManager.removeRows(
                    uri.fsPath,
                    lineNumber - 1,
                    lineNumber - 1,
                );
                rowMarkerManager.refresh();
            },
        ),

        // refresh icon when switch editor
        vscode.window.onDidChangeActiveTextEditor(() => {
            rowMarkerManager.refresh();
        }),

        // navigate to tree item position
        vscode.commands.registerCommand("auto-unstage.navigateByItem", (item) => {
            rowMarkerManager.openDocumentByItem(item);
        }),

        // remove row item in tree view
        vscode.commands.registerCommand("auto-unstage.removeTreeItem", (item) => {
            rowMarkerManager.removeRowsByItem(item);
            rowMarkerManager.refresh();
        }),

        // on config update
        vscode.workspace.onDidChangeConfiguration(({ affectsConfiguration }) => {
            const isConfigChange = affectsConfiguration("auto-unstage");
            if (isConfigChange) {
                rowMarkerManager.updateIcon(ctx);
                rowMarkerManager.refresh();
            }
        }),
    );
    // #endregion

    // #region init RepositoryWatcher
    const watcherMap = new Map<string, RepositoryWatcher>();

    const watchRepository = (repository: Repository) => {
        if (watcherMap.has(repository.rootUri.toString())) {
            return;
        }
        console.log("[Auto Unstage] watching repository", repository.rootUri.path);
        const repositoryWatcher = new RepositoryWatcher(
            repository,
            fsPath => rowMarkerManager.getUnstageRows(fsPath),
        );
        ctx.subscriptions.push(repositoryWatcher);
        watcherMap.set(repository.rootUri.toString(), repositoryWatcher);

        const repoName = path.basename(repository.rootUri.path);
        vscode.window.showInformationMessage(`[Auto Unstage] watching repository ${repoName}`);
    };

    gitExtensionApi.repositories.map(watchRepository);
    ctx.subscriptions.push(
        gitExtensionApi.onDidOpenRepository(watchRepository),
        gitExtensionApi.onDidCloseRepository((repository) => {
            watcherMap.get(repository.rootUri.toString())?.dispose();
        }),
    );
    // #endregion
}

export function deactivate() {}

if (import.meta.vitest) {
    test("vitest example", () => {
        expect(1).toBe(1);
    });
}
