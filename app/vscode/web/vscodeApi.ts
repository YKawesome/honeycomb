/**
 * VSCode webview API for communicating with the extension
 */

declare const acquireVsCodeApi: () => {
    postMessage: (message: any) => void;
    getState: () => any;
    setState: (state: any) => void;
};

const vscode = acquireVsCodeApi();

interface MessageHandler {
    resolve: (value: any) => void;
    reject: (reason?: any) => void;
}

const pendingRequests = new Map<string, MessageHandler>();
let requestCounter = 0;

// Listen for messages from the extension
window.addEventListener('message', (event) => {
    const message = event.data;

    if (message.requestId && pendingRequests.has(message.requestId)) {
        const handler = pendingRequests.get(message.requestId)!;
        pendingRequests.delete(message.requestId);
        handler.resolve(message);
    }
});

/**
 * Resolves a protocol URI (e.g., "package://relative/path.urdf") to a webview-accessible URI
 * @param uri The protocol URI to resolve
 * @returns Object containing the resolved file path and webview URI, or null if not found
 */
export async function resolveProtocolUri(uri: string): Promise<{
    originalUri: string;
    resolvedPath: string | null;
    webviewUri: string | null;
}> {
    const requestId = `resolve-${requestCounter++}`;

    return new Promise((resolve, reject) => {
        pendingRequests.set(requestId, { resolve, reject });

        vscode.postMessage({
            type: 'resolveProtocolUri',
            requestId,
            uri
        });

        // Timeout after 5 seconds
        setTimeout(() => {
            if (pendingRequests.has(requestId)) {
                pendingRequests.delete(requestId);
                reject(new Error(`Timeout resolving URI: ${uri}`));
            }
        }, 5000);
    });
}

/**
 * Gets the configured root paths from VSCode settings
 */
export async function getRootPaths(): Promise<Array<{ name: string; path: string }>> {
    const requestId = `rootpaths-${requestCounter++}`;

    return new Promise((resolve, reject) => {
        pendingRequests.set(requestId, {
            resolve: (message) => resolve(message.rootPaths),
            reject
        });

        vscode.postMessage({
            type: 'getRootPaths',
            requestId
        });

        // Timeout after 5 seconds
        setTimeout(() => {
            if (pendingRequests.has(requestId)) {
                pendingRequests.delete(requestId);
                reject(new Error('Timeout getting root paths'));
            }
        }, 5000);
    });
}

/**
 * Checks if a URI uses a custom protocol format (e.g., "package://", "cadre://")
 * Excludes standard web protocols (http, https, file, data, blob, etc.)
 */
export function isProtocolUri(uri: string): boolean {
    // Check if it matches protocol format
    const protocolMatch = uri.match(/^(\w+):\/\/.+$/);
    if (!protocolMatch) {
        return false;
    }

    const protocol = protocolMatch[1].toLowerCase();

    // Exclude standard web protocols and vscode-resource URLs
    const standardProtocols = ['http', 'https', 'file', 'data', 'blob', 'ws', 'wss', 'ftp', 'ftps'];

    return !standardProtocols.includes(protocol);
}
