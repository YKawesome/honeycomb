import { Viewer } from '@gov.nasa.jpl.honeycomb/core';
import type {
    HoneycombPlugin,
    PluginModule,
    PluginContext,
    ActivityProvider,
    Tool,
    GlobalPanel,
} from '../../common/plugins';

/**
 * Manages plugin loading and registration
 * Simplified from rsvp-lite - uses dynamic imports
 */
export class PluginManager {
    private plugins: Map<string, HoneycombPlugin> = new Map();
    private activities: Map<string, ActivityProvider> = new Map();
    private tools: Map<string, Tool> = new Map();
    private panels: Map<string, GlobalPanel> = new Map();
    private activeTool: Tool | null = null;
    private viewer: Viewer | null = null;

    constructor() {}

    setViewer(viewer: Viewer) {
        this.viewer = viewer;
    }

    /**
     * Load a plugin from a URL or path
     */
    async loadPlugin(url: string): Promise<void> {
        try {
            console.log(`Loading plugin: ${url}`);

            // Dynamic import - works with both URLs and local paths
            const module: PluginModule = await import(/* @vite-ignore */ url);

            if (!module.default) {
                throw new Error(`Plugin at ${url} does not have a default export`);
            }

            const plugin = module.default;

            // Create context for this plugin
            const context: PluginContext = {
                registerActivity: (provider) => {
                    if (this.activities.has(provider.type)) {
                        console.warn(`Activity type "${provider.type}" is already registered`);
                        return;
                    }
                    console.log(`Registered activity: ${provider.type}`);
                    this.activities.set(provider.type, provider);
                },

                registerTool: (tool) => {
                    if (this.tools.has(tool.id)) {
                        console.warn(`Tool "${tool.id}" is already registered`);
                        return;
                    }
                    console.log(`Registered tool: ${tool.id}`);
                    this.tools.set(tool.id, tool);
                },

                registerPanel: (panel) => {
                    if (this.panels.has(panel.id)) {
                        console.warn(`Panel "${panel.id}" is already registered`);
                        return;
                    }
                    console.log(`Registered panel: ${panel.id}`);
                    this.panels.set(panel.id, panel);
                },
            };

            // Activate the plugin
            await plugin.activate(context);

            // Store the plugin
            this.plugins.set(url, plugin);

            console.log(`Successfully loaded plugin: ${url}`);
        } catch (error) {
            console.error(`Failed to load plugin ${url}:`, error);
            throw error;
        }
    }

    /**
     * Load multiple plugins
     */
    async loadPlugins(urls: string[]): Promise<void> {
        for (const url of urls) {
            try {
                await this.loadPlugin(url);
            } catch (error) {
                // Continue loading other plugins even if one fails
                console.error(`Skipping failed plugin: ${url}`);
            }
        }
    }

    /**
     * Get all registered activities
     */
    getActivities(): ActivityProvider[] {
        return Array.from(this.activities.values());
    }

    /**
     * Get activity provider by type
     */
    getActivity(type: string): ActivityProvider | undefined {
        return this.activities.get(type);
    }

    /**
     * Get all registered tools
     */
    getTools(): Tool[] {
        return Array.from(this.tools.values());
    }

    /**
     * Get tool by ID
     */
    getTool(id: string): Tool | undefined {
        return this.tools.get(id);
    }

    /**
     * Activate a tool
     */
    activateTool(id: string): void {
        if (!this.viewer) {
            console.warn('Cannot activate tool: viewer not set');
            return;
        }

        const tool = this.tools.get(id);
        if (!tool) {
            console.warn(`Tool "${id}" not found`);
            return;
        }

        // Deactivate current tool
        if (this.activeTool) {
            this.activeTool.deactivate(this.viewer);
        }

        // Activate new tool
        tool.activate(this.viewer);
        this.activeTool = tool;
    }

    /**
     * Deactivate current tool
     */
    deactivateTool(): void {
        if (this.activeTool && this.viewer) {
            this.activeTool.deactivate(this.viewer);
            this.activeTool = null;
        }
    }

    /**
     * Get active tool
     */
    getActiveTool(): Tool | null {
        return this.activeTool;
    }

    /**
     * Get all registered panels
     */
    getPanels(): GlobalPanel[] {
        return Array.from(this.panels.values());
    }

    /**
     * Cleanup all plugins
     */
    async dispose(): Promise<void> {
        // Deactivate active tool
        this.deactivateTool();

        // Deactivate all plugins
        for (const plugin of this.plugins.values()) {
            try {
                await plugin.deactivate?.();
            } catch (error) {
                console.error('Error deactivating plugin:', error);
            }
        }

        this.plugins.clear();
        this.activities.clear();
        this.tools.clear();
        this.panels.clear();
    }
}

// Singleton instance
export const pluginManager = new PluginManager();
