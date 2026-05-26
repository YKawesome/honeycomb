/**
 * VSCode webview API for communicating with the extension
 */

declare const acquireVsCodeApi: () => {
    postMessage: (message: any) => void;
    getState: () => any;
    setState: (state: any) => void;
};

export const vscode = acquireVsCodeApi();

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
 * Resolves a relative path (relative to the RSF file) to a webview-accessible URI
 * @param relativePath The relative path to resolve (e.g., "./models/rover.glb")
 * @returns Object containing the resolved file path and webview URI
 */
export async function resolveRelativePath(relativePath: string): Promise<{
    originalPath: string;
    resolvedPath: string;
    webviewUri: string;
}> {
    const requestId = `resolve-relative-${requestCounter++}`;

    return new Promise((resolve, reject) => {
        pendingRequests.set(requestId, { resolve, reject });

        vscode.postMessage({
            type: 'resolveRelativePath',
            requestId,
            relativePath
        });

        // Timeout after 5 seconds
        setTimeout(() => {
            if (pendingRequests.has(requestId)) {
                pendingRequests.delete(requestId);
                reject(new Error(`Timeout resolving relative path: ${relativePath}`));
            }
        }, 5000);
    });
}

/**
 * Checks if a path is a relative path (not absolute, not a URL)
 */
export function isRelativePath(path: string): boolean {
    // Check if it's a URL with a protocol (including blob:, data:, etc.)
    if (path.match(/^[a-zA-Z][a-zA-Z0-9+.-]*:/)) {
        return false;
    }
    // Check if it's an absolute path (starts with / or drive letter on Windows)
    if (path.match(/^([a-zA-Z]:)?[/\\]/)) {
        return false;
    }
    // It's a relative path
    return true;
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
    const standardProtocols = ['http', 'https', 'file', 'data', 'blob', 'ws', 'wss', 'ftp', 'ftps', 'vscode-webview-resource'];

    return !standardProtocols.includes(protocol);
}

interface RootPathInfo {
    protocol: string;
    basePath: string;
    baseWebviewUri: string;
}

interface RsfDocumentDir {
    fsPath: string;
    webviewUri: string;
}

/**
 * Synchronously resolves a protocol URI to a webview URI using root paths from extension
 */
export function resolveProtocolUriSync(uri: string): string {
    if (!isProtocolUri(uri)) {
        return uri;
    }

    // Get root paths from global variable set by extension
    const rootPaths = (window as any).vscodeRootPaths as RootPathInfo[] | undefined;
    if (!rootPaths) {
        console.error('[resolveProtocolUriSync] vscodeRootPaths not available');
        return uri;
    }

    // Parse the protocol URI
    const match = uri.match(/^(\w+):\/\/(.+)$/);
    if (!match) {
        return uri;
    }

    const [, protocol, relativePath] = match;

    // Find matching root path
    const rootPath = rootPaths.find(rp => rp.protocol === protocol);
    if (!rootPath) {
        console.warn('[resolveProtocolUriSync] No root path configured for protocol:', protocol);
        return uri;
    }

    // Construct webview URI by joining base webview URI with relative path
    // The baseWebviewUri already points to the directory, so we just need to append the relative path
    const resolved = `${rootPath.baseWebviewUri}/${relativePath}`;
    return resolved;
}

/**
 * Synchronously resolves a relative path to a webview URI using RSF document directory
 * @param relativePath Path relative to the RSF file (e.g., "./models/rover.glb")
 * @returns Webview-accessible URI
 */
export function resolveRelativePathSync(relativePath: string): string {
    if (!isRelativePath(relativePath)) {
        return relativePath;
    }

    // Get RSF document directory from global variable set by extension
    const rsfDocDir = (window as any).rsfDocumentDir as RsfDocumentDir | undefined;
    if (!rsfDocDir) {
        console.error('[resolveRelativePathSync] rsfDocumentDir not available');
        return relativePath;
    }

    // Normalize the relative path (remove ./ prefix if present)
    let normalizedPath = relativePath;
    if (normalizedPath.startsWith('./')) {
        normalizedPath = normalizedPath.substring(2);
    } else if (normalizedPath.startsWith('../')) {
        // Handle parent directory references
        // For now, just warn and return as-is since we can't easily resolve these without a full path library
        console.warn('[resolveRelativePathSync] Parent directory references (..) not yet supported:', relativePath);
        return relativePath;
    }

    // Construct webview URI by joining RSF directory webview URI with relative path
    const resolved = `${rsfDocDir.webviewUri}/${normalizedPath}`;
    return resolved;
}
