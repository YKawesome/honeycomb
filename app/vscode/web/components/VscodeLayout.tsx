import React, { useState, useCallback } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { HoneycombPanel } from '../app';
import { SceneHierarchy } from './SceneHierarchy';
import { SettingsPanel } from './SettingsPanel';
import { PlanProvider } from './plans/PlanContext';
import { PlanSelector } from './plans/PlanSelector';
import { ActivityList } from './plans/ActivityList';
import { ActivitySettings } from './plans/ActivitySettings';
import { RSF } from '../../common/rsf';
import { SceneObject } from '@gov.nasa.jpl.honeycomb/core';
import { ensureSceneObjectIds } from '../lib/sceneUtils';
import { Button } from './ui/button';
import { Box, ListTodo } from 'lucide-react';

interface VscodeLayoutProps {
    rsf: RSF;
    onUpdate: (rsf: RSF) => void;
}

export function VscodeLayout({ rsf, onUpdate }: VscodeLayoutProps) {
    const [selectedObjectIndex, setSelectedObjectIndex] = useState<number | null>(null);
    const [activeTab, setActiveTab] = useState<'scene' | 'plans'>('scene');
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

                            {/* Bottom: Settings or Activity Settings */}
                            <Panel defaultSize={40} minSize={20}>
                                {activeTab === 'scene' ? (
                                    <SettingsPanel
                                        options={rsf.options}
                                        onChange={handleOptionsChange}
                                    />
                                ) : (
                                    <ActivitySettings />
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
                            />
                        </div>
                    </Panel>
                </PanelGroup>
            </div>
        </PlanProvider>
    );
}
