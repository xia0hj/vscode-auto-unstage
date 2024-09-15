import { Repository } from "@src/repository_watcher/git";
import * as vscode from "vscode";

interface RepositoryInternalApi extends Repository {
    repository: {
        onDidRunOperation: (
            callback: (param: { operation: { kind: string } }) => void
        ) => vscode.Disposable
        stage: (uri: vscode.Uri, stageText: string) => void
    }
}

export class RepositoryWatcher implements vscode.Disposable {
    repository: RepositoryInternalApi;
    getUnstageRows: (fsPath: string) => Set<number>;

    disposable?: vscode.Disposable;

    constructor(repository: Repository, getUnstageRows: (fsPath: string) => Set<number>) {
        this.repository = repository as RepositoryInternalApi;
        this.getUnstageRows = getUnstageRows;

        if (
            this.repository.repository == null
            || this.repository.repository.onDidRunOperation == null
            || this.repository.repository.stage == null
        ) {
            throw new Error(
                "Can not read extension vscode.git repository internal api !!!",
            );
        }

        this._watchOperationAdd();
    }

    private _watchOperationAdd() {
        this.disposable = this.repository.repository.onDidRunOperation(async ({ operation }) => {
            if (operation.kind !== "Add") {
                return;
            }

            for (const { uri } of this.repository.state.indexChanges) {
                const unstageRows = this.getUnstageRows(uri.fsPath);
                const textDocument = await vscode.workspace.openTextDocument(uri);
                const rowText: string[] = [];
                for (let row = 0; row < textDocument.lineCount; row++) {
                    if (unstageRows.has(row)) {
                        continue;
                    }
                    const curRowText = textDocument.getText(
                        new vscode.Range(row, 0, row + 1, 0),
                    );
                    rowText.push(curRowText);
                }
                this.repository.repository.stage(uri, rowText.join(""));
            }
        });
    }

    dispose() {
        this.disposable?.dispose();
    }
}
