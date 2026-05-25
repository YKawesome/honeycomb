import * as vscode from 'vscode';
import * as path from 'path';
import { resolveProtocolUri, getRootPaths } from './pathResolver';

class HoneycombRsfProvider implements vscode.CustomTextEditorProvider {
    constructor(readonly extensionPath: vscode.Uri) { }

    resolveCustomTextEditor(
        document: vscode.TextDocument,
        webviewPanel: vscode.WebviewPanel,
        token: vscode.CancellationToken,
    ): Thenable<void> | void {
        // Get configured root paths and add them to localResourceRoots
        const rootPaths = getRootPaths();
        const localResourceRoots: vscode.Uri[] = [this.extensionPath];

        for (const rootPath of rootPaths) {
            try {
                let basePath = rootPath.path;

                // Handle workspace-relative paths
                if (basePath.startsWith('${workspaceFolder}')) {
                    const workspaceFolders = vscode.workspace.workspaceFolders;
                    if (workspaceFolders && workspaceFolders.length > 0) {
                        basePath = basePath.replace('${workspaceFolder}', workspaceFolders[0].uri.fsPath);
                    }
                }

                // Convert relative paths to absolute
                if (!path.isAbsolute(basePath)) {
                    const workspaceFolders = vscode.workspace.workspaceFolders;
                    if (workspaceFolders && workspaceFolders.length > 0) {
                        basePath = path.join(workspaceFolders[0].uri.fsPath, basePath);
                    }
                }

                localResourceRoots.push(vscode.Uri.file(basePath));
            } catch (error) {
                console.error(`Failed to add root path ${rootPath.name}:`, error);
            }
        }

        webviewPanel.webview.options = {
            enableScripts: true,
            localResourceRoots,
        };

        // Handle messages from the webview
        webviewPanel.webview.onDidReceiveMessage(async (message) => {
            switch (message.type) {
                case 'resolveProtocolUri':
                    const resolved = resolveProtocolUri(message.uri);
                    if (resolved) {
                        const fileUri = vscode.Uri.file(resolved);
                        const webviewUri = webviewPanel.webview.asWebviewUri(fileUri);
                        webviewPanel.webview.postMessage({
                            type: 'protocolUriResolved',
                            requestId: message.requestId,
                            originalUri: message.uri,
                            resolvedPath: resolved,
                            webviewUri: webviewUri.toString()
                        });
                    } else {
                        webviewPanel.webview.postMessage({
                            type: 'protocolUriResolved',
                            requestId: message.requestId,
                            originalUri: message.uri,
                            resolvedPath: null,
                            webviewUri: null
                        });
                    }
                    break;
                case 'getRootPaths':
                    webviewPanel.webview.postMessage({
                        type: 'rootPaths',
                        requestId: message.requestId,
                        rootPaths: getRootPaths()
                    });
                    break;
                case 'updateRsf':
                    // Update the document with the new RSF content
                    const edit = new vscode.WorkspaceEdit();
                    const fullRange = new vscode.Range(
                        document.positionAt(0),
                        document.positionAt(document.getText().length)
                    );
                    edit.replace(document.uri, fullRange, message.content);
                    await vscode.workspace.applyEdit(edit);
                    break;
            }
        });

        const webviewJs = vscode.Uri.joinPath(this.extensionPath, "dist", "webview.js");

        // Get the RSF file content
        const rsfContent = document.getText();

        webviewPanel.webview.html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" type="text/css" href="">
    <script>
        window.vscodeExtensionPath = "${webviewPanel.webview.asWebviewUri(this.extensionPath)}";
        window.rsfContent = ${JSON.stringify(rsfContent)};
    </script>
</head>
<body style="height: 100vh; width: 100vw; padding: 0;">
    <div style="width: 100%; height: 100%;" id="root"></div>
    <script type="module" src="${webviewPanel.webview.asWebviewUri(webviewJs)}"></script>
</body>
</html>`;

        // Update the webview when the document changes
        const changeDocumentSubscription = vscode.workspace.onDidChangeTextDocument(e => {
            if (e.document.uri.toString() === document.uri.toString()) {
                webviewPanel.webview.postMessage({
                    type: 'updateRsf',
                    content: e.document.getText()
                });
            }
        });

        webviewPanel.onDidDispose(() => {
            changeDocumentSubscription.dispose();
        });
    }
}

export function activate(context: vscode.ExtensionContext) {
    context.subscriptions.push(
        vscode.window.registerCustomEditorProvider(
            'honeycomb.rsf',
            new HoneycombRsfProvider(context.extensionUri),
            { webviewOptions: { retainContextWhenHidden: true } }
        )
    );
}

export function deactivate() { }
