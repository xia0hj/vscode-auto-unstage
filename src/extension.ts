import * as vscode from "vscode";
import { expect, test } from "vitest";
import { RowMarkerManager } from "@src/row_marker_manager";
import { GitExtension } from "@src/repository_watcher/git";
import { RepositoryWatcher } from "@src/repository_watcher";

export function activate(ctx: vscode.ExtensionContext) {
    const rowMarkerManager = new RowMarkerManager(ctx);

    const gitExtensionApi = vscode.extensions.getExtension<GitExtension>("vscode.git")?.exports?.getAPI(1);
    if (gitExtensionApi == undefined) {
        console.warn("Extension vscode.auto-unstage failed to activate, can not found dependency vscode.git.");
        return false;
    }

    const watcherMap = new Map<string, RepositoryWatcher>();
    
    const watchRepositoryOpen = gitExtensionApi.onDidOpenRepository(
        (repository) => {
            const repositoryWatcher = new RepositoryWatcher(
                repository,
                fsPath => rowMarkerManager.getUnstageRows(fsPath),
            );
            ctx.subscriptions.push(repositoryWatcher);
            watcherMap.set(repository.rootUri.toString(), repositoryWatcher);
        },
    );
    ctx.subscriptions.push(watchRepositoryOpen);

    const watchRepositoryClose = gitExtensionApi.onDidCloseRepository((repository) => {
        watcherMap.get(repository.rootUri.toString())?.dispose();
    });
    ctx.subscriptions.push(watchRepositoryClose);

    vscode.window.showInformationMessage("Extension vscode.auto-unstage activate successfully !!!");
}

export function deactivate() {}

if (import.meta.vitest) {
    test("vitest example", () => {
        expect(1).toBe(1);
    });
}
