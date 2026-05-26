import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { usePlans } from './PlanContext';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { ScrollArea } from '../ui/scroll-area';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '../ui/alert-dialog';
import { cn } from '../../lib/utils';

export const PlanSelector: React.FC = () => {
    const {
        plans,
        activePlan,
        setActivePlan,
        createPlan,
        deletePlan,
    } = usePlans();

    const [isCreating, setIsCreating] = useState(false);
    const [newPlanName, setNewPlanName] = useState('');

    const handleCreate = () => {
        if (newPlanName.trim()) {
            createPlan(newPlanName.trim());
            setNewPlanName('');
            setIsCreating(false);
        }
    };

    return (
        <div className="flex flex-col h-full border-r">
            <div className="flex items-center justify-between px-2 py-1.5 border-b bg-muted/50">
                <h3 className="text-xs font-semibold">Plans</h3>
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => setIsCreating(true)}
                    title="Create plan"
                >
                    <Plus className="h-3 w-3" />
                </Button>
            </div>

            <ScrollArea className="flex-1">
                <div className="py-1">
                    {isCreating && (
                        <div className="px-2 py-1">
                            <Input
                                autoFocus
                                placeholder="Plan name"
                                value={newPlanName}
                                onChange={(e) => setNewPlanName(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        handleCreate();
                                    } else if (e.key === 'Escape') {
                                        setIsCreating(false);
                                        setNewPlanName('');
                                    }
                                }}
                                onBlur={() => {
                                    if (newPlanName.trim()) {
                                        handleCreate();
                                    } else {
                                        setIsCreating(false);
                                    }
                                }}
                                className="h-7 text-xs"
                            />
                        </div>
                    )}

                    {plans.length === 0 && !isCreating ? (
                        <div className="text-sm text-muted-foreground text-center py-8 px-4">
                            No plans yet
                        </div>
                    ) : (
                        plans.map((plan) => {
                            const isActive = activePlan?.uuid === plan.uuid;

                            return (
                                <div
                                    key={plan.uuid}
                                    className={cn(
                                        'flex items-center gap-1 py-1 px-1.5 hover:bg-accent cursor-pointer group',
                                        isActive && 'bg-primary text-primary-foreground hover:bg-primary/90'
                                    )}
                                    onClick={() => setActivePlan(plan.uuid)}
                                >
                                    <span className="flex-1 truncate text-xs">
                                        {plan.name}
                                    </span>
                                    <span className="text-[10px] text-muted-foreground">
                                        {plan.activities.length}
                                    </span>

                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-5 w-5 p-0 text-destructive"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <Trash2 className="h-3 w-3" />
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Delete Plan</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        Are you sure you want to delete "{plan.name}"? This action cannot be undone.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                    <AlertDialogAction
                                                        onClick={() => deletePlan(plan.uuid)}
                                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                    >
                                                        Delete
                                                    </AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
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
