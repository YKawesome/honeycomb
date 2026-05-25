import React, { useEffect, useState, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { VscodeHoneycombOptions } from '../common/rsf';
import { resolveProtocolUri, isProtocolUri } from './vscodeApi';
import { VscodeLayout } from './components/VscodeLayout';
import { ensureSceneObjectIds } from './lib/sceneUtils';
import './globals.css';

const builtinFetch = window.fetch;

window.fetch = async (input, init) => {
    if (typeof input === "string" && isProtocolUri(input)) {
        // Only intercept protocol URIs (e.g., package://, cadre://)
        const resolved = await resolveProtocolUri(input);
        if (resolved.webviewUri) {
            input = resolved.webviewUri;
        } else {
            throw new Error(`Failed to resolve protocol URI: ${input}`);
        }
    }
    // Let all other URLs (including relative paths) pass through unchanged

    return builtinFetch(input, init);
}

function VscodeHoneycomb() {
    const [rsf, setRsf] = useState<VscodeHoneycombOptions>();
    const [error, setError] = useState<string>();

    // Define handleUpdate BEFORE any conditional returns (Rules of Hooks)
    const handleUpdate = useCallback((updatedRsf: VscodeHoneycombOptions) => {
        console.log('[VscodeHoneycomb] RSF updated:', updatedRsf);
        setRsf(updatedRsf);

        // Send update message to extension to save the file
        window.postMessage({
            type: 'updateRsf',
            content: JSON.stringify(updatedRsf, null, 2)
        }, '*');
    }, []);

    useEffect(() => {
        console.log('[VscodeHoneycomb] Initializing...');

        // Load initial RSF content from global variable
        const rsfContent = (window as any).rsfContent;
        console.log('[VscodeHoneycomb] RSF content from window:', rsfContent);

        if (rsfContent) {
            try {
                const parsed = JSON.parse(rsfContent);
                console.log('[VscodeHoneycomb] Parsed RSF:', parsed);
                // Ensure all scene objects have IDs
                const rsfWithIds = {
                    ...parsed,
                    scene: ensureSceneObjectIds(parsed.scene || [])
                };
                setRsf(rsfWithIds);
            } catch (error) {
                const errorMsg = `Failed to parse RSF content: ${error}`;
                console.error('[VscodeHoneycomb]', errorMsg);
                setError(errorMsg);
            }
        } else {
            console.warn('[VscodeHoneycomb] No RSF content found in window');
            // Set empty RSF to allow viewer to load
            setRsf({
                options: {
                    playbackSpeed: 1,
                    gridVisibility: true,
                    up: '+Z',
                    viewCube: true,
                    lightDirection: [1, 1, 1],
                    lightIntensity: 1,
                    ambientLightIntensity: 0.5
                },
                scene: []
            });
        }

        // Listen for RSF updates from the extension
        const messageHandler = (event: MessageEvent) => {
            const message = event.data;
            console.log('[VscodeHoneycomb] Message received:', message);

            if (message.type === 'updateRsf') {
                try {
                    const parsed = JSON.parse(message.content);
                    console.log('[VscodeHoneycomb] Updated RSF:', parsed);
                    // Ensure all scene objects have IDs
                    const rsfWithIds = {
                        ...parsed,
                        scene: ensureSceneObjectIds(parsed.scene || [])
                    };
                    setRsf(rsfWithIds);
                    setError(undefined);
                } catch (error) {
                    const errorMsg = `Failed to parse updated RSF content: ${error}`;
                    console.error('[VscodeHoneycomb]', errorMsg);
                    setError(errorMsg);
                }
            }
        };

        window.addEventListener('message', messageHandler);
        return () => window.removeEventListener('message', messageHandler);
    }, []);

    if (error) {
        return (
            <div style={{ padding: '20px', color: 'white', backgroundColor: '#1e1e1e' }}>
                <h2>Error loading RSF</h2>
                <pre>{error}</pre>
            </div>
        );
    }

    if (!rsf) {
        return (
            <div style={{ padding: '20px', color: 'white', backgroundColor: '#1e1e1e' }}>
                <h2>Loading...</h2>
            </div>
        );
    }

    return (
        <VscodeLayout rsf={rsf} onUpdate={handleUpdate} />
    )
}

async function main() {
    const root = document.getElementById('root');
    if (root) {
        // Apply dark mode class to html element for Tailwind
        document.documentElement.classList.add('dark');

        const rootDom = createRoot(root);
        rootDom.render(<VscodeHoneycomb />);
    } else {
        console.error("No 'root' element");
    }
}

main();
