import React, { createContext, useContext, useEffect, useState } from 'react';
import { pluginManager, PluginManager } from './PluginManager';
import type { ActivityProvider, Tool, GlobalPanel, PlanSettingsProvider, ObjectSettingsProvider } from '../../common/plugins';

interface PluginContextValue {
    manager: PluginManager;
    activities: ActivityProvider[];
    tools: Tool[];
    panels: GlobalPanel[];
    planSettingsProviders: PlanSettingsProvider[];
    objectSettingsProviders: ObjectSettingsProvider[];
    activeTool: Tool | null;
    activateTool: (id: string) => void;
    deactivateTool: () => void;
}

const PluginContext = createContext<PluginContextValue | null>(null);

export const usePlugins = () => {
    const context = useContext(PluginContext);
    if (!context) {
        throw new Error('usePlugins must be used within PluginProvider');
    }
    return context;
};

interface PluginProviderProps {
    children: React.ReactNode;
}

export const PluginProvider: React.FC<PluginProviderProps> = ({ children }) => {
    const [activities, setActivities] = useState<ActivityProvider[]>([]);
    const [tools, setTools] = useState<Tool[]>([]);
    const [panels, setPanels] = useState<GlobalPanel[]>([]);
    const [planSettingsProviders, setPlanSettingsProviders] = useState<PlanSettingsProvider[]>([]);
    const [objectSettingsProviders, setObjectSettingsProviders] = useState<ObjectSettingsProvider[]>([]);
    const [activeTool, setActiveTool] = useState<Tool | null>(null);

    // Refresh registries when they change
    const refreshRegistries = () => {
        setActivities(pluginManager.getActivities());
        setTools(pluginManager.getTools());
        setPanels(pluginManager.getPanels());
        setPlanSettingsProviders(pluginManager.getPlanSettingsProviders());
        setObjectSettingsProviders(pluginManager.getObjectSettingsProviders());
        setActiveTool(pluginManager.getActiveTool());
    };

    // Initial load
    useEffect(() => {
        refreshRegistries();
    }, []);

    const handleActivateTool = (id: string) => {
        pluginManager.activateTool(id);
        setActiveTool(pluginManager.getActiveTool());
    };

    const handleDeactivateTool = () => {
        pluginManager.deactivateTool();
        setActiveTool(null);
    };

    const value: PluginContextValue = {
        manager: pluginManager,
        activities,
        tools,
        panels,
        planSettingsProviders,
        objectSettingsProviders,
        activeTool,
        activateTool: handleActivateTool,
        deactivateTool: handleDeactivateTool,
    };

    return (
        <PluginContext.Provider value={value}>
            {children}
        </PluginContext.Provider>
    );
};
