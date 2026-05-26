import React, { createContext, useContext, useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { Plan, Activity, RSF } from '../../../common/rsf';
import { usePlugins } from '../../plugins/PluginContext';

interface PlanContextValue {
    plans: Plan[];
    activePlan: Plan | null;
    selectedActivity: Activity | null;

    setActivePlan: (planId: string | null) => void;
    setSelectedActivity: (activityId: string | null) => void;

    createPlan: (name: string) => void;
    deletePlan: (planId: string) => void;
    updatePlan: (planId: string, updates: Partial<Plan>) => void;

    addActivity: (planId: string, type: string, parameters: any) => void;
    updateActivity: (planId: string, activityId: string, updates: Partial<Activity>) => void;
    deleteActivity: (planId: string, activityId: string) => void;
    moveActivity: (planId: string, activityId: string, direction: 'up' | 'down') => void;

    onRsfUpdate: (rsf: RSF) => void;
}

const PlanContext = createContext<PlanContextValue | null>(null);

export const usePlans = () => {
    const context = useContext(PlanContext);
    if (!context) {
        throw new Error('usePlans must be used within PlanProvider');
    }
    return context;
};

interface PlanProviderProps {
    initialPlans?: Plan[];
    onUpdate?: (plans: Plan[]) => void;
    children: React.ReactNode;
}

export const PlanProvider: React.FC<PlanProviderProps> = ({
    initialPlans = [],
    onUpdate,
    children,
}) => {
    const { planSettingsProviders } = usePlugins();
    const [plans, setPlans] = useState<Plan[]>(initialPlans);
    const [activePlanId, setActivePlanId] = useState<string | null>(
        initialPlans.length > 0 ? initialPlans[0].uuid : null
    );
    const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);

    const activePlan = plans.find(p => p.uuid === activePlanId) || null;
    const selectedActivity = activePlan?.activities.find(a => a.uuid === selectedActivityId) || null;

    const notifyUpdate = useCallback((updatedPlans: Plan[]) => {
        setPlans(updatedPlans);
        onUpdate?.(updatedPlans);
    }, [onUpdate]);

    const setActivePlan = useCallback((planId: string | null) => {
        setActivePlanId(planId);
        setSelectedActivityId(null);
    }, []);

    const setSelectedActivity = useCallback((activityId: string | null) => {
        setSelectedActivityId(activityId);
    }, []);

    const createPlan = useCallback((name: string) => {
        // Initialize plan globals from all registered providers
        const globals: Record<string, any> = {};
        for (const provider of planSettingsProviders) {
            globals[provider.id] = provider.getDefaultGlobals();
        }

        const newPlan: Plan = {
            uuid: uuidv4(),
            name,
            initialState: {
                time: 0,
                state: {},
            },
            activities: [],
            globals,
        };

        const updatedPlans = [...plans, newPlan];
        notifyUpdate(updatedPlans);
        setActivePlanId(newPlan.uuid);
    }, [plans, planSettingsProviders, notifyUpdate]);

    const deletePlan = useCallback((planId: string) => {
        const updatedPlans = plans.filter(p => p.uuid !== planId);
        notifyUpdate(updatedPlans);

        if (activePlanId === planId) {
            setActivePlanId(updatedPlans.length > 0 ? updatedPlans[0].uuid : null);
        }
    }, [plans, activePlanId, notifyUpdate]);

    const updatePlan = useCallback((planId: string, updates: Partial<Plan>) => {
        const updatedPlans = plans.map(p =>
            p.uuid === planId ? { ...p, ...updates } : p
        );
        notifyUpdate(updatedPlans);
    }, [plans, notifyUpdate]);

    const addActivity = useCallback((planId: string, type: string, parameters: any) => {
        const newActivity: Activity = {
            uuid: uuidv4(),
            type,
            parameters,
        };

        const updatedPlans = plans.map(p => {
            if (p.uuid === planId) {
                return {
                    ...p,
                    activities: [...p.activities, newActivity],
                };
            }
            return p;
        });

        notifyUpdate(updatedPlans);
        setSelectedActivityId(newActivity.uuid);
    }, [plans, notifyUpdate]);

    const updateActivity = useCallback((
        planId: string,
        activityId: string,
        updates: Partial<Activity>
    ) => {
        const updatedPlans = plans.map(p => {
            if (p.uuid === planId) {
                return {
                    ...p,
                    activities: p.activities.map(a =>
                        a.uuid === activityId ? { ...a, ...updates } : a
                    ),
                };
            }
            return p;
        });

        notifyUpdate(updatedPlans);
    }, [plans, notifyUpdate]);

    const deleteActivity = useCallback((planId: string, activityId: string) => {
        const updatedPlans = plans.map(p => {
            if (p.uuid === planId) {
                return {
                    ...p,
                    activities: p.activities.filter(a => a.uuid !== activityId),
                };
            }
            return p;
        });

        notifyUpdate(updatedPlans);

        if (selectedActivityId === activityId) {
            setSelectedActivityId(null);
        }
    }, [plans, selectedActivityId, notifyUpdate]);

    const moveActivity = useCallback((
        planId: string,
        activityId: string,
        direction: 'up' | 'down'
    ) => {
        const updatedPlans = plans.map(p => {
            if (p.uuid === planId) {
                const activities = [...p.activities];
                const index = activities.findIndex(a => a.uuid === activityId);

                if (index === -1) return p;

                const newIndex = direction === 'up' ? index - 1 : index + 1;

                if (newIndex < 0 || newIndex >= activities.length) return p;

                // Swap
                [activities[index], activities[newIndex]] = [activities[newIndex], activities[index]];

                return { ...p, activities };
            }
            return p;
        });

        notifyUpdate(updatedPlans);
    }, [plans, notifyUpdate]);

    const onRsfUpdate = useCallback((rsf: RSF) => {
        if (rsf.plans) {
            setPlans(rsf.plans);
            // If no active plan and plans exist, activate first one
            if (!activePlanId && rsf.plans.length > 0) {
                setActivePlanId(rsf.plans[0].uuid);
            }
        }
    }, [activePlanId]);

    const value: PlanContextValue = {
        plans,
        activePlan,
        selectedActivity,
        setActivePlan,
        setSelectedActivity,
        createPlan,
        deletePlan,
        updatePlan,
        addActivity,
        updateActivity,
        deleteActivity,
        moveActivity,
        onRsfUpdate,
    };

    return (
        <PlanContext.Provider value={value}>
            {children}
        </PlanContext.Provider>
    );
};
