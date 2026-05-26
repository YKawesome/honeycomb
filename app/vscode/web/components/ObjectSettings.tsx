import React, { useState, useMemo } from 'react';
import { Object3D } from 'three';
import { Viewer } from '@gov.nasa.jpl.honeycomb/core';
import { usePlugins } from '../plugins/PluginContext';
import { ScrollArea } from './ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import * as LucideIcons from 'lucide-react';

interface ObjectSettingsProps {
    object: Object3D;
    rsfObject: any;
    viewer: Viewer;
    onRsfChange?: (updates: any) => void;
}

export function ObjectSettings({ object, rsfObject, viewer, onRsfChange }: ObjectSettingsProps) {
    const { objectSettingsProviders } = usePlugins();

    // Find all providers that can handle this object
    const applicableProviders = useMemo(() => {
        return objectSettingsProviders.filter(provider => provider.canHandle(object));
    }, [objectSettingsProviders, object]);

    const [activeTab, setActiveTab] = useState<string>(
        applicableProviders.length > 0 ? applicableProviders[0].id : ''
    );

    if (applicableProviders.length === 0) {
        return (
            <div className="flex flex-col h-full">
                <div className="flex items-center justify-between px-2 py-1.5 border-b bg-muted/50">
                    <h3 className="text-xs font-semibold">Object Settings</h3>
                </div>
                <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
                    No settings available for this object
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full border-l">
            <div className="flex items-center justify-between px-2 py-1.5 border-b bg-muted/50">
                <h3 className="text-xs font-semibold">Object Settings</h3>
            </div>

            {applicableProviders.length === 1 ? (
                // Single provider - no tabs needed
                <ScrollArea className="flex-1">
                    {React.createElement(applicableProviders[0].SettingsComponent, {
                        object,
                        rsfObject,
                        viewer,
                        onRsfChange,
                    })}
                </ScrollArea>
            ) : (
                // Multiple providers - show tabs
                <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
                    <TabsList className="w-full justify-start rounded-none border-b bg-transparent p-0 shrink-0">
                        {applicableProviders.map(provider => {
                            const Icon = provider.icon
                                ? (LucideIcons as any)[provider.icon]
                                : null;

                            return (
                                <TabsTrigger
                                    key={provider.id}
                                    value={provider.id}
                                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-muted"
                                >
                                    {Icon && <Icon className="h-3 w-3 mr-1" />}
                                    {provider.name}
                                </TabsTrigger>
                            );
                        })}
                    </TabsList>

                    {applicableProviders.map(provider => (
                        <TabsContent key={provider.id} value={provider.id} className="m-0 flex-1 overflow-hidden">
                            <ScrollArea className="h-full">
                                {React.createElement(provider.SettingsComponent, {
                                    object,
                                    rsfObject,
                                    viewer,
                                    onRsfChange,
                                })}
                            </ScrollArea>
                        </TabsContent>
                    ))}
                </Tabs>
            )}
        </div>
    );
}
