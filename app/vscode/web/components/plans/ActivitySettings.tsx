import React from 'react';
import { usePlans } from './PlanContext';
import { usePlugins } from '../../plugins/PluginContext';
import { ScrollArea } from '../ui/scroll-area';

export const ActivitySettings: React.FC = () => {
    const {
        activePlan,
        selectedActivity,
        updateActivity,
    } = usePlans();

    const { activities: activityProviders } = usePlugins();

    if (!activePlan || !selectedActivity) {
        return (
            <div className="flex flex-col h-full">
                <div className="flex items-center justify-between px-2 py-1.5 border-b bg-muted/50">
                    <h3 className="text-xs font-semibold">Activity Settings</h3>
                </div>
                <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
                    No activity selected
                </div>
            </div>
        );
    }

    const provider = activityProviders.find(p => p.type === selectedActivity.type);

    if (!provider) {
        return (
            <div className="flex flex-col h-full">
                <div className="flex items-center justify-between px-2 py-1.5 border-b bg-muted/50">
                    <h3 className="text-xs font-semibold">Activity Settings</h3>
                </div>
                <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground px-4 text-center">
                    Unknown activity type: {selectedActivity.type}
                </div>
            </div>
        );
    }

    const handleChange = (parameters: any) => {
        updateActivity(activePlan.uuid, selectedActivity.uuid, { parameters });
    };

    return (
        <div className="flex flex-col h-full border-l">
            <div className="flex items-center justify-between px-2 py-1.5 border-b bg-muted/50">
                <h3 className="text-xs font-semibold">
                    {provider.name}
                </h3>
            </div>

            <ScrollArea className="flex-1">
                <div className="p-3">
                    {provider.SettingsComponent ? (
                        <provider.SettingsComponent
                            activity={selectedActivity}
                            plan={activePlan}
                            onChange={handleChange}
                        />
                    ) : (
                        <div className="text-sm text-muted-foreground text-center py-8">
                            No settings available
                        </div>
                    )}
                </div>
            </ScrollArea>
        </div>
    );
};
