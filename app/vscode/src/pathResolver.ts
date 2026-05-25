import * as vscode from 'vscode';
import * as path from 'path';

export interface RootPathConfig {
    name: string;
    path: string;
}

/**
 * Gets the configured root paths from VSCode settings
 */
export function getRootPaths(): RootPathConfig[] {
    const config = vscode.workspace.getConfiguration('honeycomb');
    return config.get<RootPathConfig[]>('rootPaths', []);
}

/**
 * Resolves a protocol URL (e.g., "package://relative/path.urdf") to an absolute file path
 * @param uri The protocol URI to resolve
 * @returns Absolute file path or null if protocol not found
 */
export function resolveProtocolUri(uri: string): string | null {
    const match = uri.match(/^(\w+):\/\/(.+)$/);
    if (!match) {
        return null;
    }

    const [, protocol, relativePath] = match;
    const rootPaths = getRootPaths();

    const rootPathConfig = rootPaths.find(rp => rp.name === protocol);
    if (!rootPathConfig) {
        return null;
    }

    let basePath = rootPathConfig.path;

    // Handle workspace-relative paths (starting with ${workspaceFolder})
    if (basePath.startsWith('${workspaceFolder}')) {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            return null;
        }
        basePath = basePath.replace('${workspaceFolder}', workspaceFolders[0].uri.fsPath);
    }

    // Handle relative paths (convert to absolute using first workspace folder)
    if (!path.isAbsolute(basePath)) {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            return null;
        }
        basePath = path.join(workspaceFolders[0].uri.fsPath, basePath);
    }

    return path.join(basePath, relativePath);
}

/**
 * Converts a file path to a protocol URI if it matches any configured root path
 * @param filePath Absolute file path
 * @returns Protocol URI or the original path if no match
 */
export function filePathToProtocolUri(filePath: string): string {
    const rootPaths = getRootPaths();

    for (const rootPathConfig of rootPaths) {
        let basePath = rootPathConfig.path;

        // Handle workspace-relative paths
        if (basePath.startsWith('${workspaceFolder}')) {
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders || workspaceFolders.length === 0) {
                continue;
            }
            basePath = basePath.replace('${workspaceFolder}', workspaceFolders[0].uri.fsPath);
        }

        // Handle relative paths
        if (!path.isAbsolute(basePath)) {
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders || workspaceFolders.length === 0) {
                continue;
            }
            basePath = path.join(workspaceFolders[0].uri.fsPath, basePath);
        }

        // Normalize paths for comparison
        const normalizedBase = path.normalize(basePath);
        const normalizedFile = path.normalize(filePath);

        if (normalizedFile.startsWith(normalizedBase)) {
            const relativePath = path.relative(normalizedBase, normalizedFile);
            return `${rootPathConfig.name}://${relativePath.replace(/\\/g, '/')}`;
        }
    }

    return filePath;
}
