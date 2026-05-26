import './polyfills';
import React, { useEffect, useState, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { RSF } from '../common/rsf';
import { detectRSFVersion, migrateToRSF2 } from '../common/migration';
import { vscode, resolveProtocolUri, isProtocolUri } from './vscodeApi';
import { VscodeLayout } from './components/VscodeLayout';
import { ensureSceneObjectIds } from './lib/sceneUtils';
import { PluginProvider } from './plugins/PluginContext';
import { pluginManager } from './plugins/PluginManager';
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
    const [rsf, setRsf] = useState<RSF>();
    const [error, setError] = useState<string>();
    const [pluginsLoaded, setPluginsLoaded] = useState(false);
    const [migrationPrompt, setMigrationPrompt] = useState<{
        version: string;
        originalRsf: any;
    } | null>(null);

    const handleUpdate = useCallback((updatedRsf: RSF) => {
        setRsf(updatedRsf);

        // Send update message to extension to save the file
        vscode.postMessage({
            type: 'updateRsf',
            content: JSON.stringify(updatedRsf, null, 2)
        });
    }, []);

    // Load plugins when RSF changes
    useEffect(() => {
        if (!rsf || !rsf.plugins || rsf.plugins.length === 0) {
            setPluginsLoaded(true);
            return;
        }

        let cancelled = false;

        const loadPlugins = async () => {
            try {
                console.log('[VscodeHoneycomb] Loading plugins:', rsf.plugins);
                await pluginManager.loadPlugins(rsf.plugins!);
                if (!cancelled) {
                    setPluginsLoaded(true);
                }
            } catch (error) {
                console.error('[VscodeHoneycomb] Failed to load plugins:', error);
                if (!cancelled) {
                    setPluginsLoaded(true); // Continue even if plugins fail
                }
            }
        };

        loadPlugins();

        return () => {
            cancelled = true;
        };
    }, [rsf]);

    const handleMigrate = useCallback(() => {
        if (!migrationPrompt) return;

        try {
            const migrated = migrateToRSF2(migrationPrompt.originalRsf);
            setRsf(migrated);
            setMigrationPrompt(null);

            // Save migrated file
            vscode.postMessage({
                type: 'updateRsf',
                content: JSON.stringify(migrated, null, 2)
            });
        } catch (err) {
            setError(`Migration failed: ${err}`);
            setMigrationPrompt(null);
        }
    }, [migrationPrompt]);

    const handleCancelMigration = useCallback(() => {
        setMigrationPrompt(null);
        setError('Cannot load RSF 1.0 files. Please migrate to RSF 2.0 format.');
    }, []);

    useEffect(() => {
        // Load initial RSF content from global variable
        const rsfContent = (window as any).rsfContent;

        if (rsfContent) {
            try {
                const parsed = JSON.parse(rsfContent);

                // Detect version and prompt for migration if needed
                const version = detectRSFVersion(parsed);
                console.log('[VscodeHoneycomb] Detected RSF version:', version);

                if (version === "1.0") {
                    // Prompt user to migrate
                    setMigrationPrompt({
                        version,
                        originalRsf: parsed
                    });
                } else if (version === "2.0") {
                    // RSF 2.0 - use directly
                    const rsfWithIds = {
                        ...parsed,
                        scene: ensureSceneObjectIds(parsed.scene || [])
                    };
                    setRsf(rsfWithIds as RSF);
                } else {
                    setError(`Unknown RSF format version. Please use RSF 2.0 format.`);
                }
            } catch (error) {
                const errorMsg = `Failed to parse RSF content: ${error}`;
                console.error('[VscodeHoneycomb]', errorMsg);
                setError(errorMsg);
            }
        } else {
            console.warn('[VscodeHoneycomb] No RSF content found in window');
            // Set empty RSF 2.0 to allow viewer to load
            setRsf({
                version: "2.0",
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

            if (message.type === 'updateRsf') {
                try {
                    const parsed = JSON.parse(message.content);

                    // Detect version
                    const version = detectRSFVersion(parsed);

                    if (version === "1.0") {
                        setMigrationPrompt({
                            version,
                            originalRsf: parsed
                        });
                    } else if (version === "2.0") {
                        const rsfWithIds = {
                            ...parsed,
                            scene: ensureSceneObjectIds(parsed.scene || [])
                        };
                        setRsf(rsfWithIds as RSF);
                        setError(undefined);
                    } else {
                        setError(`Unknown RSF format version. Please use RSF 2.0 format.`);
                    }
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

    // Show migration prompt if needed
    if (migrationPrompt) {
        return (
            <div style={{ padding: '40px', color: 'white', backgroundColor: '#1e1e1e', height: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                <div style={{ maxWidth: '600px', textAlign: 'center' }}>
                    <h2 style={{ marginBottom: '20px' }}>RSF Format Migration Required</h2>
                    <p style={{ marginBottom: '10px', lineHeight: '1.5' }}>
                        This file is using RSF {migrationPrompt.version} format.
                        This viewer supports RSF 2.0+ which requires a migration.
                    </p>
                    <p style={{ marginBottom: '30px', lineHeight: '1.5' }}>
                        Would you like to automatically migrate this file to RSF 2.0?
                    </p>
                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                        <button
                            onClick={handleMigrate}
                            style={{
                                padding: '10px 20px',
                                backgroundColor: '#0e639c',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '14px'
                            }}
                        >
                            Migrate to RSF 2.0
                        </button>
                        <button
                            onClick={handleCancelMigration}
                            style={{
                                padding: '10px 20px',
                                backgroundColor: '#444',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '14px'
                            }}
                        >
                            Cancel
                        </button>
                    </div>
                    <p style={{ marginTop: '20px', fontSize: '12px', color: '#888' }}>
                        See <a href="https://github.com/nasa-jpl/honeycomb/blob/main/MIGRATION-GUIDE.md" style={{ color: '#0e639c' }}>Migration Guide</a> for details
                    </p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div style={{ padding: '20px', color: 'white', backgroundColor: '#1e1e1e' }}>
                <h2>Error loading RSF</h2>
                <pre>{error}</pre>
            </div>
        );
    }

    if (!rsf || !pluginsLoaded) {
        return (
            <div style={{ padding: '20px', color: 'white', backgroundColor: '#1e1e1e' }}>
                <h2>Loading...</h2>
            </div>
        );
    }

    return (
        <PluginProvider>
            <VscodeLayout rsf={rsf} onUpdate={handleUpdate} />
        </PluginProvider>
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
