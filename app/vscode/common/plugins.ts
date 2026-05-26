import type { FC } from 'react';
import type { Object3D } from 'three';
import type { Viewer } from '@gov.nasa.jpl.honeycomb/core';
import type { Activity, Plan, Frame, RobotState, PlanState } from './rsf';

/**
 * Visual state of an activity object in the UI
 */
export enum ActivityVisualState {
    /** Plan is not active */
    DISABLED = 'disabled',
    /** Plan is active but activity not selected */
    ACTIVE = 'active',
    /** Activity is selected */
    SELECTED = 'selected',
}

/**
 * Category hint for organizing activities in UI
 */
export enum ActivityCategory {
    MOTION = 'motion',
    SENSING = 'sensing',
    KIOZ = 'kioz',
    OTHER = 'other',
}

/**
 * 3D object representing an activity in the scene
 * Simpler than rsvp-lite: just handles visualization
 */
export interface ActivityObject<S = any, T extends RobotState = RobotState> extends Object3D {
    /**
     * Update visuals for this activity
     * Called frequently during interaction
     */
    update(
        initialState: T,
        activity: Activity<S>,
        plan: Plan,
        visualState: ActivityVisualState
    ): void;

    /**
     * Generate keyframes for robot motion
     * Called less frequently, when activity parameters change
     */
    generateKeyframes?(
        initialFrame: Frame<T>,
        activity: Activity<S>,
        plan: Plan,
        activityIndex: number
    ): Promise<Frame<T>[]> | Frame<T>[];

    /**
     * Optional cleanup
     */
    dispose?(): void;
}

/**
 * Props passed to activity settings component
 */
export interface ActivitySettingsProps<S = any> {
    activity: Activity<S>;
    plan: Plan;
    onChange: (parameters: S) => void;
}

/**
 * Props passed to plan settings component
 */
export interface PlanSettingsProps<G = any> {
    plan: Plan;
    onChange: (globals: G) => void;
}

/**
 * Plan settings provider - defines global plan-level settings
 */
export interface PlanSettingsProvider<G = any> {
    /** Provider identifier */
    id: string;

    /** Display name */
    name: string;

    /** Description */
    description?: string;

    /**
     * React component for settings UI
     */
    SettingsComponent: FC<PlanSettingsProps<G>>;

    /**
     * Get default globals for a new plan
     */
    getDefaultGlobals(): G;
}

/**
 * Props passed to object settings component
 */
export interface ObjectSettingsProps {
    /** Three.js Object3D for runtime manipulation */
    object: Object3D;
    /** The RSF SceneObject definition with channels */
    rsfObject: any; // SceneObject from RSF
    /** Viewer instance */
    viewer: Viewer;
    /** Called when RSF channels are modified */
    onRsfChange?: (updates: any) => void;
}

/**
 * Object settings provider - defines settings panes for specific object types
 */
export interface ObjectSettingsProvider {
    /** Provider identifier */
    id: string;

    /** Display name shown in tab */
    name: string;

    /** Icon name (lucide-react) */
    icon?: string;

    /**
     * Check if this provider can handle the given object
     */
    canHandle(object: Object3D): boolean;

    /**
     * React component for settings UI
     */
    SettingsComponent: FC<ObjectSettingsProps>;
}

/**
 * Activity provider - defines an activity type
 * Follows Grafana pattern: builder API for data, React for UI
 */
export interface ActivityProvider<S = any, T extends RobotState = RobotState> {
    /** Activity type identifier */
    type: string;

    /** Display name */
    name: string;

    /** Description */
    description?: string;

    /** Category for UI organization */
    category: ActivityCategory;

    /**
     * Create a new activity object for visualization
     * Similar to Annotation class in Grafana
     */
    createObject(viewer: Viewer): ActivityObject<S, T>;

    /**
     * Optional React component for settings UI
     * Similar to Grafana's panel editor components
     */
    SettingsComponent?: FC<ActivitySettingsProps<S>>;

    /**
     * Provide default parameters when creating a new activity
     */
    getDefaultParameters(plan: Plan, previousActivity?: Activity): S;
}

/**
 * Tool for handling user interactions
 * Tools can modify the viewer's interaction manager
 */
export interface Tool {
    /** Tool identifier */
    id: string;

    /** Display name */
    name: string;

    /** Icon name (lucide-react) */
    icon?: string;

    /**
     * Activate this tool
     * Can attach event listeners, modify controls, etc.
     */
    activate(viewer: Viewer): void;

    /**
     * Deactivate this tool
     * Should clean up any listeners/modifications
     */
    deactivate(viewer: Viewer): void;
}

/**
 * Global UI panel that's always visible
 * Can be used for persistent overlays, status displays, etc.
 */
export interface GlobalPanel {
    /** Panel identifier */
    id: string;

    /** React component to render */
    Component: FC;

    /** Placement hint */
    placement?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}

/**
 * Plugin context passed to activate()
 */
export interface PluginContext {
    /** Register an activity provider */
    registerActivity<S = any, T extends RobotState = RobotState>(
        provider: ActivityProvider<S, T>
    ): void;

    /** Register a tool */
    registerTool(tool: Tool): void;

    /** Register a global UI panel */
    registerPanel(panel: GlobalPanel): void;

    /** Register plan-level settings */
    registerPlanSettings<G = any>(provider: PlanSettingsProvider<G>): void;

    /** Register object-specific settings */
    registerObjectSettings(provider: ObjectSettingsProvider): void;
}

/**
 * Plugin interface - simplified from rsvp-lite
 */
export interface HoneycombPlugin {
    /**
     * Called when plugin is loaded
     * Register activity providers, tools, and panels here
     */
    activate(context: PluginContext): void | Promise<void>;

    /**
     * Optional cleanup
     */
    deactivate?(): void | Promise<void>;
}

/**
 * Plugin module structure
 */
export interface PluginModule {
    /** Default export should be the plugin */
    default: HoneycombPlugin;
}
