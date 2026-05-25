import { resolveProtocolUri, isProtocolUri } from './vscodeApi';

/**
 * Resolves a URL, handling protocol URIs (e.g., package://...) by converting them
 * to webview-accessible URIs
 * @param url The URL to resolve
 * @returns The resolved webview-accessible URL
 */
export async function resolveUrl(url: string): Promise<string> {
    if (isProtocolUri(url)) {
        const resolved = await resolveProtocolUri(url);
        if (resolved.webviewUri) {
            return resolved.webviewUri;
        }
        throw new Error(`Failed to resolve protocol URI: ${url}`);
    }
    return url;
}

/**
 * Creates a URL resolver function that can be used with LoadingManager
 * This will intercept URLs and resolve protocol URIs before loading
 */
export function createUrlResolver() {
    const cache = new Map<string, string>();

    return async (url: string): Promise<string> => {
        // Check cache first
        if (cache.has(url)) {
            return cache.get(url)!;
        }

        const resolved = await resolveUrl(url);
        cache.set(url, resolved);
        return resolved;
    };
}

/**
 * Wraps a URL loading function to automatically resolve protocol URIs
 * @param loadFn The original loading function
 * @returns A wrapped loading function that resolves protocol URIs
 */
export function wrapUrlLoader<T>(
    loadFn: (url: string, ...args: any[]) => Promise<T>
): (url: string, ...args: any[]) => Promise<T> {
    return async (url: string, ...args: any[]): Promise<T> => {
        const resolvedUrl = await resolveUrl(url);
        return loadFn(resolvedUrl, ...args);
    };
}
