import { SceneOptions, Scene } from "@gov.nasa.jpl.honeycomb/core";

/**
 * State snapshot for embedded telemetry data
 * Used by VSCode for offline playback, not needed for Grafana
 */
export interface StateSnapshot {
    /**
     * Unix timestamp in milliseconds
     */
    timestamp: number;

    /**
     * Field values at this timestamp
     * Keys match the 'field' property in animated channels
     */
    fields: Record<string, any>;
}

/**
 * Array of state snapshots for playback
 */
export type StateHistory = StateSnapshot[];

/**
 * Generic robot state (extensible by plugins)
 */
export interface RobotState {
    [key: string]: any;
}

/**
 * Timestamped frame of robot state
 */
export interface Frame<T = RobotState> {
    time: number;
    state: T;
}

/**
 * Parameters associated with an activity
 */
export interface Activity<S = any> {
    /**
     * Unique identifier for this activity
     */
    uuid: string;

    /**
     * Activity type registered by plugin
     */
    type: string;

    /**
     * Type-specific parameters
     */
    parameters: S;
}

/**
 * Plan state at a specific time (which activities are visible)
 */
export type PlanState = Record<string, boolean>;

/**
 * Activity plan - chronological list of activities
 */
export interface Plan {
    /**
     * Plan name
     */
    name: string;

    /**
     * Unique identifier
     */
    uuid: string;

    /**
     * Robot model ID to visualize (optional)
     */
    robot?: string;

    /**
     * Initial robot state
     */
    initialState: Frame<RobotState>;

    /**
     * Global plan parameters (plugin-specific)
     */
    globals?: Record<string, any>;

    /**
     * Activities in chronological order
     */
    activities: Activity[];
}

/**
 * RSF 2.0 format with version tagging
 * This is the complete file format used by VSCode extension
 * Grafana only uses Scene and SceneOptions directly from queries
 */
export interface RSF {
    /**
     * Format version, always "2.0" for this spec
     */
    version: "2.0";

    /**
     * Scene configuration options
     */
    options: SceneOptions;

    /**
     * Scene objects (models, frames, annotations)
     */
    scene: Scene;

    /**
     * Optional embedded telemetry data for offline playback
     */
    stateHistory?: StateHistory;

    /**
     * Activity plans
     */
    plans?: Plan[];

    /**
     * Plugin scripts to load (paths or URLs)
     */
    plugins?: string[];
}
