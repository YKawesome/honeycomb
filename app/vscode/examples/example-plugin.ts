/**
 * Example Honeycomb Plugin
 *
 * Demonstrates:
 * - Activity provider with 3D visualization and React settings
 * - Plan-wide settings that affect all activities
 * - Tool for custom interaction
 * - Global UI panel
 */

import { Object3D, SphereGeometry, MeshBasicMaterial, Mesh, Vector3, BufferGeometry, LineBasicMaterial, Line } from 'three';
import {
    HoneycombPlugin,
    PluginContext,
    ActivityProvider,
    ActivityObject,
    ActivityVisualState,
    ActivitySettingsProps,
    PlanSettingsProvider,
    PlanSettingsProps,
    Tool,
    GlobalPanel,
    ActivityCategory,
} from '../common/plugins';

import {
    Activity,
    Plan,
    RobotState,
    Frame,
} from '../common/rsf';

import type { Viewer } from '@gov.nasa.jpl.honeycomb/core';
import React from 'react';

// ============================================================================
// WAYPOINT ACTIVITY
// ============================================================================

interface WaypointParams {
    x: number;
    y: number;
    z: number;
    label?: string;
}

class WaypointObject extends Object3D implements ActivityObject<WaypointParams> {
    private marker: Mesh;
    private pathLine: Line | null = null;
    private viewer: Viewer;

    constructor(viewer: Viewer) {
        super();
        this.viewer = viewer;

        // Create a sphere marker
        const geometry = new SphereGeometry(0.3, 16, 16);
        const material = new MeshBasicMaterial({ color: 0x00ff00 });
        this.marker = new Mesh(geometry, material);
        this.add(this.marker);
    }

    update(
        initialState: RobotState,
        activity: Activity<WaypointParams>,
        plan: Plan,
        visualState: ActivityVisualState
    ): void {
        // Update position
        this.position.set(
            activity.parameters.x,
            activity.parameters.y,
            activity.parameters.z
        );

        // Change color based on state
        const material = this.marker.material as MeshBasicMaterial;
        switch (visualState) {
            case ActivityVisualState.SELECTED:
                material.color.setHex(0xffff00); // Yellow
                this.marker.scale.setScalar(1.5);
                break;
            case ActivityVisualState.ACTIVE:
                material.color.setHex(0x00ff00); // Green
                this.marker.scale.setScalar(1.0);
                break;
            case ActivityVisualState.DISABLED:
                material.color.setHex(0x888888); // Gray
                this.marker.scale.setScalar(0.8);
                break;
        }

        // Draw path from initial state
        if (initialState.position) {
            const [x, y, z] = initialState.position as number[];
            const start = new Vector3(x, y, z);
            const end = new Vector3(
                activity.parameters.x,
                activity.parameters.y,
                activity.parameters.z
            );

            // Remove old line
            if (this.pathLine) {
                this.remove(this.pathLine);
                this.pathLine.geometry.dispose();
                (this.pathLine.material as LineBasicMaterial).dispose();
            }

            // Create new line
            const points = [start, end];
            const geometry = new BufferGeometry().setFromPoints(points);
            const material = new LineBasicMaterial({
                color: visualState === ActivityVisualState.SELECTED ? 0xffff00 : 0x00ff00,
                opacity: 0.5,
                transparent: true
            });
            this.pathLine = new Line(geometry, material);
            this.add(this.pathLine);
        }

        this.viewer.dirty = true;
    }

    async generateKeyframes(
        initialFrame: Frame<RobotState>,
        activity: Activity<WaypointParams>,
        plan: Plan,
        activityIndex: number
    ): Promise<Frame<RobotState>[]> {
        // Get max speed from plan globals
        const maxSpeed = plan.globals?.waypointSettings?.maxSpeed || 1.0;

        // Calculate distance
        const start = initialFrame.state.position as number[] || [0, 0, 0];
        const end = [activity.parameters.x, activity.parameters.y, activity.parameters.z];
        const distance = Math.sqrt(
            Math.pow(end[0] - start[0], 2) +
            Math.pow(end[1] - start[1], 2) +
            Math.pow(end[2] - start[2], 2)
        );

        // Calculate duration based on distance and max speed
        const duration = distance / maxSpeed;

        return [
            initialFrame,
            {
                time: initialFrame.time + duration,
                state: {
                    ...initialFrame.state,
                    position: end
                }
            }
        ];
    }

    dispose(): void {
        this.marker.geometry.dispose();
        (this.marker.material as MeshBasicMaterial).dispose();
        if (this.pathLine) {
            this.pathLine.geometry.dispose();
            (this.pathLine.material as LineBasicMaterial).dispose();
        }
    }
}

const WaypointSettings: React.FC<ActivitySettingsProps<WaypointParams>> = ({
    activity,
    onChange
}) => {
    return React.createElement('div', { className: 'space-y-3' },
        React.createElement('div', {},
            React.createElement('label', { className: 'text-xs font-medium' }, 'X Position'),
            React.createElement('input', {
                type: 'number',
                value: activity.parameters.x,
                onChange: (e: any) => onChange({
                    ...activity.parameters,
                    x: parseFloat(e.target.value)
                }),
                className: 'w-full mt-1 px-2 py-1 text-sm border rounded',
                step: 0.1
            })
        ),
        React.createElement('div', {},
            React.createElement('label', { className: 'text-xs font-medium' }, 'Y Position'),
            React.createElement('input', {
                type: 'number',
                value: activity.parameters.y,
                onChange: (e: any) => onChange({
                    ...activity.parameters,
                    y: parseFloat(e.target.value)
                }),
                className: 'w-full mt-1 px-2 py-1 text-sm border rounded',
                step: 0.1
            })
        ),
        React.createElement('div', {},
            React.createElement('label', { className: 'text-xs font-medium' }, 'Z Position'),
            React.createElement('input', {
                type: 'number',
                value: activity.parameters.z,
                onChange: (e: any) => onChange({
                    ...activity.parameters,
                    z: parseFloat(e.target.value)
                }),
                className: 'w-full mt-1 px-2 py-1 text-sm border rounded',
                step: 0.1
            })
        ),
        React.createElement('div', {},
            React.createElement('label', { className: 'text-xs font-medium' }, 'Label'),
            React.createElement('input', {
                type: 'text',
                value: activity.parameters.label || '',
                onChange: (e: any) => onChange({
                    ...activity.parameters,
                    label: e.target.value
                }),
                className: 'w-full mt-1 px-2 py-1 text-sm border rounded',
                placeholder: 'Optional'
            })
        )
    );
};

const waypointProvider: ActivityProvider<WaypointParams> = {
    type: 'waypoint',
    name: 'Waypoint',
    description: 'Navigate to a specific position',
    category: ActivityCategory.MOTION,

    createObject(viewer: Viewer) {
        return new WaypointObject(viewer);
    },

    SettingsComponent: WaypointSettings,

    getDefaultParameters(plan: Plan, previousActivity?: Activity) {
        if (previousActivity?.parameters?.x !== undefined) {
            return {
                x: previousActivity.parameters.x + 1,
                y: previousActivity.parameters.y,
                z: previousActivity.parameters.z,
            };
        }
        return { x: 0, y: 0, z: 0 };
    }
};

// ============================================================================
// PLAN SETTINGS
// ============================================================================

interface WaypointSettingsProps {
    maxSpeed: number;
    showPaths: boolean;
}

const WaypointSettingsComponent: React.FC<PlanSettingsProps<WaypointSettingsProps>> = ({
    plan,
    onChange
}) => {
    const settings = plan.globals?.waypointSettings || { maxSpeed: 1.0, showPaths: true };

    return React.createElement('div', { className: 'space-y-3' },
        React.createElement('div', {},
            React.createElement('label', { className: 'text-xs font-medium' }, 'Max Speed (m/s)'),
            React.createElement('input', {
                type: 'number',
                value: settings.maxSpeed,
                onChange: (e: any) => onChange({
                    ...settings,
                    maxSpeed: parseFloat(e.target.value)
                }),
                className: 'w-full mt-1 px-2 py-1 text-sm border rounded',
                step: 0.1,
                min: 0.1
            })
        ),
        React.createElement('div', { className: 'flex items-center gap-2' },
            React.createElement('input', {
                type: 'checkbox',
                id: 'showPaths',
                checked: settings.showPaths,
                onChange: (e: any) => onChange({
                    ...settings,
                    showPaths: e.target.checked
                }),
                className: 'rounded'
            }),
            React.createElement('label', {
                htmlFor: 'showPaths',
                className: 'text-xs font-medium'
            }, 'Show Paths')
        )
    );
};

const waypointSettingsProvider: PlanSettingsProvider<WaypointSettingsProps> = {
    id: 'waypointSettings',
    name: 'Waypoint Settings',
    description: 'Configure waypoint behavior for all activities',
    SettingsComponent: WaypointSettingsComponent,
    getDefaultGlobals() {
        return {
            maxSpeed: 1.0,
            showPaths: true
        };
    }
};

// ============================================================================
// TOOL
// ============================================================================

const cameraTool: Tool = {
    id: 'free-camera',
    name: 'Free Camera',
    icon: 'video',

    activate(viewer: Viewer) {
        viewer.controls.enabled = true;
        viewer.controls.enableKeys = true;
        console.log('[Example Plugin] Free camera activated');
    },

    deactivate(viewer: Viewer) {
        viewer.controls.enableKeys = false;
        console.log('[Example Plugin] Free camera deactivated');
    }
};

// ============================================================================
// GLOBAL PANEL
// ============================================================================

const StatusPanel: React.FC = () => {
    return React.createElement('div', {
        className: 'bg-background/90 backdrop-blur-sm p-2 rounded shadow-lg border'
    },
        React.createElement('div', { className: 'text-xs font-semibold mb-1' }, 'Example Plugin'),
        React.createElement('div', { className: 'text-xs text-muted-foreground' }, 'Loaded successfully')
    );
};

const statusPanel: GlobalPanel = {
    id: 'example-status',
    Component: StatusPanel,
    placement: 'top-right'
};

// ============================================================================
// PLUGIN
// ============================================================================

const plugin: HoneycombPlugin = {
    activate(context: PluginContext) {
        console.log('[Example Plugin] Activating...');

        context.registerActivity(waypointProvider);
        context.registerPlanSettings(waypointSettingsProvider);
        context.registerTool(cameraTool);
        context.registerPanel(statusPanel);

        console.log('[Example Plugin] Activated successfully');
    },

    deactivate() {
        console.log('[Example Plugin] Deactivated');
    }
};

export default plugin;
