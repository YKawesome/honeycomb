import React, { useState, useCallback } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { HoneycombPanel } from '../app';
import { SceneHierarchy } from './SceneHierarchy';
import { SettingsPanel } from './SettingsPanel';
import { RSF } from '../../common/rsf';
import { SceneObject } from '@gov.nasa.jpl.honeycomb/core';
import { ensureSceneObjectIds } from '../lib/sceneUtils';

interface VscodeLayoutProps {
    rsf: RSF;
    onUpdate: (rsf: RSF) => void;
}

export function VscodeLayout({ rsf, onUpdate }: VscodeLayoutProps) {
    const [selectedObjectIndex, setSelectedObjectIndex] = useState<number | null>(null);
    const scene = rsf.scene;

    const handleSceneChange = useCallback((updater: (scene: SceneObject[]) => SceneObject[]) => {
        const newScene = updater(rsf.scene);
        // Ensure all objects have IDs before updating
        const sceneWithIds = ensureSceneObjectIds(newScene);
        onUpdate({
            ...rsf,
            scene: sceneWithIds,
        });
    }, [rsf, onUpdate]);

    const handleToggleVisibility = useCallback((index: number) => {
        handleSceneChange((scene) => {
            const newScene = [...scene];
            // Toggle visible property (will need to track this in the object)
            // For now, this is a placeholder
            return newScene;
        });
    }, [handleSceneChange]);

    const handleDelete = useCallback((index: number) => {
        handleSceneChange((scene) => scene.filter((_, i) => i !== index));
        if (selectedObjectIndex === index) {
            setSelectedObjectIndex(null);
        }
    }, [handleSceneChange, selectedObjectIndex]);

    const handleOptionsChange = useCallback((options: Partial<typeof rsf.options>) => {
        onUpdate({
            ...rsf,
            options: {
                ...rsf.options,
                ...options,
            },
        });
    }, [rsf, onUpdate]);

    return (
        <div className="h-screen w-screen flex bg-background text-foreground">
            <PanelGroup direction="horizontal">
                {/* Left Sidebar - Scene Hierarchy and Settings */}
                <Panel defaultSize={20} minSize={15} maxSize={35}>
                    <PanelGroup direction="vertical">
                        {/* Scene Hierarchy */}
                        <Panel defaultSize={60} minSize={30}>
                            <SceneHierarchy
                                scene={rsf.scene}
                                selectedIndex={selectedObjectIndex}
                                onSelect={setSelectedObjectIndex}
                                onToggleVisibility={handleToggleVisibility}
                                onDelete={handleDelete}
                            />
                        </Panel>

                        <PanelResizeHandle className="h-1 bg-border hover:bg-primary transition-colors" />

                        {/* Settings Panel */}
                        <Panel defaultSize={40} minSize={20}>
                            <SettingsPanel
                                options={rsf.options}
                                onChange={handleOptionsChange}
                            />
                        </Panel>
                    </PanelGroup>
                </Panel>

                <PanelResizeHandle className="w-1 bg-border hover:bg-primary transition-colors" />

                {/* Right - 3D Viewer */}
                <Panel defaultSize={80} minSize={60} className="bg-black">
                    <div className="w-full h-full">
                        <HoneycombPanel
                            scene={scene}
                            options={rsf.options}
                            stateHistory={rsf.stateHistory}
                        />
                    </div>
                </Panel>
            </PanelGroup>
        </div>
    );
}
