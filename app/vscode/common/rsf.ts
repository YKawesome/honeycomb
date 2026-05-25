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
}
