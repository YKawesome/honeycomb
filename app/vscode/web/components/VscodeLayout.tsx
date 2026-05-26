import React, { useState, useCallback, useMemo } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { HoneycombPanel } from '../app';
import { SceneHierarchy } from './SceneHierarchy';
import { SettingsPanel } from './SettingsPanel';
import { PlanProvider } from './plans/PlanContext';
import { PlanSelector } from './plans/PlanSelector';
import { ActivityList } from './plans/ActivityList';
import { ActivitySettings } from './plans/ActivitySettings';
import { PlanSettings } from './plans/PlanSettings';
import { RSF } from '../../common/rsf';
import { SceneObject } from '@gov.nasa.jpl.honeycomb/core';
import { ensureSceneObjectIds } from '../lib/sceneUtils';
import { Button } from './ui/button';
import { Box, ListTodo } from 'lucide-react';
import { pluginManager } from '../plugins/PluginManager';

interface VscodeLayoutProps {
    rsf: RSF;
    onUpdate: (rsf: RSF) => void;
}

export function VscodeLayout({ rsf, onUpdate }: VscodeLayoutProps) {
    const [selectedObjectIndex, setSelectedObjectIndex] = useState<number | null>(null);
    const [activeTab, setActiveTab] = useState<'scene' | 'plans'>('scene');
    const [planSettingsTab, setPlanSettingsTab] = useState<'plan' | 'activity'>('activity');
    const [viewer, setViewer] = useState<any>(null);
    const scene = rsf.scene;

    // Get both the Three.js object and RSF object when selection changes
    const selectedObjects = useMemo(() => {
        if (selectedObjectIndex === null || !viewer) return { threeObject: null, rsfObject: null };

        const rsfObject = rsf.scene[selectedObjectIndex];
        if (!rsfObject?.name) return { threeObject: null, rsfObject: null };

        // Look up by name - both RSF SceneObject and Three.js Object3D have name
        const threeObject = viewer.world.getObjectByName(rsfObject.name);

        if (!threeObject) {
            console.warn(`[VscodeLayout] Could not find Three.js object for "${rsfObject.name}"`);
        }

        return { threeObject: threeObject || null, rsfObject };
    }, [selectedObjectIndex, viewer, rsf.scene]);

    const handleSceneChange = useCallback((updater: (scene: SceneObject[]) => SceneObject[]) => {
        const newScene = updater(rsf.scene);
        // Ensure all objects have IDs before updating
        const sceneWithIds = ensureSceneObjectIds(newScene);
        onUpdate({
            ...rsf,
            scene: sceneWithIds,
        });
    }, [rsf, onUpdate]);

    // Handler for RSF object changes
    const handleRsfObjectChange = useCallback((updates: any) => {
        if (selectedObjectIndex === null) return;

        handleSceneChange((scene) => {
            const newScene = [...scene];
            newScene[selectedObjectIndex] = {
                ...newScene[selectedObjectIndex],
                ...updates
            } as SceneObject;
            return newScene;
        });
    }, [selectedObjectIndex, handleSceneChange]);

    const handlePlansUpdate = useCallback((plans: typeof rsf.plans) => {
        onUpdate({
            ...rsf,
            plans,
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

    const handleViewerReady = useCallback((newViewer: any) => {
        setViewer(newViewer);
        pluginManager.setViewer(newViewer);
    }, []);

    return (
        <PlanProvider initialPlans={rsf.plans} onUpdate={handlePlansUpdate}>
            <div className="h-screen w-screen flex bg-background text-foreground">
                <PanelGroup direction="horizontal">
                    {/* Left Sidebar - Scene/Plans and Settings */}
                    <Panel defaultSize={20} minSize={15} maxSize={35}>
                        <PanelGroup direction="vertical">
                            {/* Top: Scene or Plans */}
                            <Panel defaultSize={60} minSize={30}>
                                <div className="flex flex-col h-full">
                                    {/* Tab buttons */}
                                    <div className="flex border-b">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className={`flex-1 rounded-none border-b-2 ${
                                                activeTab === 'scene'
                                                    ? 'border-primary bg-muted'
                                                    : 'border-transparent'
                                            }`}
                                            onClick={() => setActiveTab('scene')}
                                        >
                                            <Box className="h-4 w-4 mr-1" />
                                            Scene
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className={`flex-1 rounded-none border-b-2 ${
                                                activeTab === 'plans'
                                                    ? 'border-primary bg-muted'
                                                    : 'border-transparent'
                                            }`}
                                            onClick={() => setActiveTab('plans')}
                                        >
                                            <ListTodo className="h-4 w-4 mr-1" />
                                            Plans
                                        </Button>
                                    </div>

                                    {/* Content area */}
                                    <div className="flex-1 overflow-hidden">
                                        {activeTab === 'scene' ? (
                                            <SceneHierarchy
                                                scene={rsf.scene}
                                                selectedIndex={selectedObjectIndex}
                                                onSelect={setSelectedObjectIndex}
                                                onToggleVisibility={handleToggleVisibility}
                                                onDelete={handleDelete}
                                            />
                                        ) : (
                                            <PanelGroup direction="horizontal">
                                                <Panel defaultSize={40} minSize={30}>
                                                    <PlanSelector />
                                                </Panel>
                                                <PanelResizeHandle className="w-0.5 bg-border" />
                                                <Panel defaultSize={60} minSize={30}>
                                                    <ActivityList />
                                                </Panel>
                                            </PanelGroup>
                                        )}
                                    </div>
                                </div>
                            </Panel>

                            <PanelResizeHandle className="h-1 bg-border hover:bg-primary transition-colors" />

                            {/* Bottom: Settings or Plan/Activity Settings */}
                            <Panel defaultSize={40} minSize={20}>
                                {activeTab === 'scene' ? (
                                    <SettingsPanel
                                        options={rsf.options}
                                        onChange={handleOptionsChange}
                                        selectedThreeObject={selectedObjects.threeObject}
                                        selectedRsfObject={selectedObjects.rsfObject}
                                        onRsfObjectChange={handleRsfObjectChange}
                                        viewer={viewer}
                                    />
                                ) : (
                                    <div className="flex flex-col h-full">
                                        {/* Sub-tabs for Plan Settings vs Activity Settings */}
                                        <div className="flex border-b">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className={`flex-1 rounded-none border-b-2 text-xs ${
                                                    planSettingsTab === 'plan'
                                                        ? 'border-primary bg-muted'
                                                        : 'border-transparent'
                                                }`}
                                                onClick={() => setPlanSettingsTab('plan')}
                                            >
                                                Plan
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className={`flex-1 rounded-none border-b-2 text-xs ${
                                                    planSettingsTab === 'activity'
                                                        ? 'border-primary bg-muted'
                                                        : 'border-transparent'
                                                }`}
                                                onClick={() => setPlanSettingsTab('activity')}
                                            >
                                                Activity
                                            </Button>
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 overflow-hidden">
                                            {planSettingsTab === 'plan' ? (
                                                <PlanSettings scene={rsf.scene} />
                                            ) : (
                                                <ActivitySettings />
                                            )}
                                        </div>
                                    </div>
                                )}
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
                                onViewerReady={handleViewerReady}
                            />
                        </div>
                    </Panel>
                </PanelGroup>
            </div>
        </PlanProvider>
    );
}
