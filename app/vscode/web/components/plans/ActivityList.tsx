import React from 'react';
import { ChevronUp, ChevronDown, Trash2, Plus } from 'lucide-react';
import { usePlans } from './PlanContext';
import { usePlugins } from '../../plugins/PluginContext';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import { cn } from '../../lib/utils';

export const ActivityList: React.FC = () => {
    const {
        activePlan,
        selectedActivity,
        setSelectedActivity,
        deleteActivity,
        moveActivity,
    } = usePlans();

    const { activities: activityProviders } = usePlugins();

    if (!activePlan) {
        return (
            <div className="flex flex-col h-full">
                <div className="flex items-center justify-between px-2 py-1.5 border-b bg-muted/50">
                    <h3 className="text-xs font-semibold">Activities</h3>
                </div>
                <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
                    No plan selected
                </div>
            </div>
        );
    }

    const getProviderName = (type: string) => {
        const provider = activityProviders.find(p => p.type === type);
        return provider?.name || type;
    };

    return (
        <div className="flex flex-col h-full border-r">
            <div className="flex items-center justify-between px-2 py-1.5 border-b bg-muted/50">
                <h3 className="text-xs font-semibold">Activities</h3>
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    title="Add activity"
                >
                    <Plus className="h-3 w-3" />
                </Button>
            </div>

            <ScrollArea className="flex-1">
                <div className="py-1">
                    {activePlan.activities.length === 0 ? (
                        <div className="text-sm text-muted-foreground text-center py-8 px-4">
                            No activities yet
                        </div>
                    ) : (
                        activePlan.activities.map((activity, index) => {
                            const isSelected = selectedActivity?.uuid === activity.uuid;
                            const isFirst = index === 0;
                            const isLast = index === activePlan.activities.length - 1;

                            return (
                                <div
                                    key={activity.uuid}
                                    className={cn(
                                        'flex items-center gap-1 py-1 px-1.5 hover:bg-accent cursor-pointer group',
                                        isSelected && 'bg-primary text-primary-foreground hover:bg-primary/90'
                                    )}
                                    onClick={() => setSelectedActivity(activity.uuid)}
                                >
                                    <span className="flex-1 truncate text-xs">
                                        {index + 1}. {getProviderName(activity.type)}
                                    </span>

                                    <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-5 w-5 p-0"
                                            disabled={isFirst}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                moveActivity(activePlan.uuid, activity.uuid, 'up');
                                            }}
                                        >
                                            <ChevronUp className="h-3 w-3" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-5 w-5 p-0"
                                            disabled={isLast}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                moveActivity(activePlan.uuid, activity.uuid, 'down');
                                            }}
                                        >
                                            <ChevronDown className="h-3 w-3" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-5 w-5 p-0 text-destructive"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                deleteActivity(activePlan.uuid, activity.uuid);
                                            }}
                                        >
                                            <Trash2 className="h-3 w-3" />
                                        </Button>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </ScrollArea>
        </div>
    );
};
