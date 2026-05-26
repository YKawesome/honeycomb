import React from 'react';
import { usePlans } from './PlanContext';
import { usePlugins } from '../../plugins/PluginContext';
import { ScrollArea } from '../ui/scroll-area';
import { Separator } from '../ui/separator';
import { CorePlanSettings } from './CorePlanSettings';
import type { SceneObject } from '@gov.nasa.jpl.honeycomb/core';

interface PlanSettingsProps {
    scene: SceneObject[];
}

export const PlanSettings: React.FC<PlanSettingsProps> = ({ scene }) => {
    const { activePlan, updatePlan } = usePlans();
    const { planSettingsProviders } = usePlugins();

    if (!activePlan) {
        return (
            <div className="flex flex-col h-full">
                <div className="flex items-center justify-between px-2 py-1.5 border-b bg-muted/50">
                    <h3 className="text-xs font-semibold">Plan Settings</h3>
                </div>
                <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
                    No plan selected
                </div>
            </div>
        );
    }

    const handleChange = (providerId: string, globals: any) => {
        updatePlan(activePlan.uuid, {
            globals: {
                ...activePlan.globals,
                [providerId]: globals,
            },
        });
    };

    return (
        <div className="flex flex-col h-full border-l">
            <div className="flex items-center justify-between px-2 py-1.5 border-b bg-muted/50">
                <h3 className="text-xs font-semibold">Plan Settings</h3>
            </div>

            <ScrollArea className="flex-1">
                <div className="p-3 space-y-4">
                    {/* Core plan settings */}
                    <div>
                        <div className="space-y-2">
                            <div>
                                <h4 className="text-sm font-semibold">General</h4>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    Core plan configuration
                                </p>
                            </div>
                            <CorePlanSettings scene={scene} />
                        </div>
                    </div>

                    {/* Plugin-registered settings */}
                    {planSettingsProviders.length > 0 && (
                        <>
                            <Separator className="my-4" />
                            {planSettingsProviders.map((provider, index) => {
                                const globals = activePlan.globals?.[provider.id] || provider.getDefaultGlobals();

                                return (
                                    <div key={provider.id}>
                                        {index > 0 && <Separator className="my-4" />}
                                        <div className="space-y-2">
                                            <div>
                                                <h4 className="text-sm font-semibold">{provider.name}</h4>
                                                {provider.description && (
                                                    <p className="text-xs text-muted-foreground mt-0.5">
                                                        {provider.description}
                                                    </p>
                                                )}
                                            </div>
                                            <provider.SettingsComponent
                                                plan={activePlan}
                                                onChange={(newGlobals) => handleChange(provider.id, newGlobals)}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </>
                    )}
                </div>
            </ScrollArea>
        </div>
    );
};
