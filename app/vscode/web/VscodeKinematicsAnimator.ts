import { Euler, Quaternion, Object3D } from 'three';
import {
    Orientation,
    OrientationConvention,
    Position,
    ChannelType,
    KinematicChannel,
    SceneObject,
} from "@gov.nasa.jpl.honeycomb/core";
import { TelemetryAnimator, type KinematicState, type RobotState } from '@gov.nasa.jpl.honeycomb/telemetry-animator';
import { StateSnapshot } from '../common/rsf';

const eulerXYZ = new Euler();
const quaternion = new Quaternion();

/**
 * Evaluates a kinematic channel at a specific time
 * For constant channels, returns the constant value
 * For animated channels, looks up the value from state history
 */
function evaluateChannel(
    channel: KinematicChannel,
    time: number,
    stateHistory?: StateSnapshot[]
): number {
    if (channel.type === ChannelType.constant) {
        return channel.value;
    }

    // For animated channels, look up from state history
    if (channel.type === ChannelType.animated && channel.field && stateHistory) {
        // Find the snapshot closest to (but not after) the requested time
        let closestSnapshot: StateSnapshot | null = null;
        let closestTime = -Infinity;

        for (const snapshot of stateHistory) {
            if (snapshot.timestamp <= time && snapshot.timestamp > closestTime) {
                closestSnapshot = snapshot;
                closestTime = snapshot.timestamp;
            }
        }

        if (closestSnapshot && channel.field in closestSnapshot.fields) {
            return closestSnapshot.fields[channel.field];
        }

        // Fallback to default value if no data found
        return channel.value;
    }

    // Default fallback
    return channel.value;
}

/**
 * Evaluates position channels
 */
function evaluatePosition(
    position: Position,
    time: number,
    stateHistory?: StateSnapshot[]
): { x: number; y: number; z: number } {
    return {
        x: evaluateChannel(position.x, time, stateHistory),
        y: evaluateChannel(position.y, time, stateHistory),
        z: evaluateChannel(position.z, time, stateHistory),
    };
}

/**
 * Evaluates orientation channels and returns a quaternion
 */
function evaluateOrientation(
    orientation: Orientation,
    time: number,
    stateHistory?: StateSnapshot[]
): { x: number; y: number; z: number; w: number } {
    const x = evaluateChannel(orientation.x, time, stateHistory);
    const y = evaluateChannel(orientation.y, time, stateHistory);
    const z = evaluateChannel(orientation.z, time, stateHistory);

    switch (orientation.type) {
        case OrientationConvention.rpy:
            // Roll-Pitch-Yaw (Euler angles) -> convert to quaternion
            eulerXYZ.set(x, y, z, 'XYZ');
            quaternion.setFromEuler(eulerXYZ);
            return {
                x: quaternion.x,
                y: quaternion.y,
                z: quaternion.z,
                w: quaternion.w,
            };

        case OrientationConvention.hamilton:
            // Hamilton quaternion (W, X, Y, Z) -> reorder to (X, Y, Z, W)
            const w_hamilton = evaluateChannel(orientation.w, time, stateHistory);
            return { x, y, z, w: w_hamilton };

        case OrientationConvention.jpl:
            // JPL quaternion (X, Y, Z, W) -> already in correct order
            const w_jpl = evaluateChannel(orientation.w, time, stateHistory);

            // Validate quaternion (avoid all zeros)
            if (x === 0 && y === 0 && z === 0 && w_jpl === 0) {
                console.warn('[VscodeKinematicsAnimator] Invalid quaternion (all zeros), using identity');
                return { x: 0, y: 0, z: 0, w: 1 };
            }

            return { x, y, z, w: w_jpl };

        default:
            console.error('[VscodeKinematicsAnimator] Unknown orientation convention:', orientation.type);
            return { x: 0, y: 0, z: 0, w: 1 };
    }
}

/**
 * VSCode Kinematics Animator
 *
 * Applies kinematic channel data (positions, orientations, joints) to Three.js objects.
 * Supports both constant channels and animated channels with state history.
 * Extends TelemetryAnimator for seekable timeline playback.
 */
export class VscodeKinematicsAnimator extends TelemetryAnimator<KinematicState> {
    private scene: SceneObject[] = [];
    private stateHistory?: StateSnapshot[];
    private viewer: any; // AnimatedViewer type

    constructor(viewer: any) {
        super();
        this.viewer = viewer;
        this.seekable = true;
        this.continuous = false;
        this.interpolate = false;
    }

    /**
     * Set the scene to animate
     */
    setScene(scene: SceneObject[]) {
        this.scene = scene;
        this.updateViewerObjects(this.time);
    }

    /**
     * Set state history for animated channels
     */
    setStateHistory(stateHistory?: StateSnapshot[]) {
        this.stateHistory = stateHistory;
        if (stateHistory && stateHistory.length > 0) {

            // Update time bounds
            const times = stateHistory.map(s => s.timestamp);
            this._startTime = Math.min(...times);
            this._endTime = Math.max(...times);
        }

        this.updateViewerObjects(this.time);
    }

    /**
     * Override setTime to apply transforms to viewer objects
     */
    async setTime(time: number): Promise<void> {
        await super.setTime(time);
        this.updateViewerObjects(this.time);
    }

    /**
     * Update all viewer objects to a specific time
     */
    private updateViewerObjects(time: number) {
        if (!this.viewer || !this.scene) {
            return;
        }

        // Build kinematic state
        const kinematicState: KinematicState = {};

        for (const obj of this.scene) {
            const pos = evaluatePosition(obj.position, time, this.stateHistory);
            const quat = evaluateOrientation(obj.orientation, time, this.stateHistory);

            const robotState: RobotState = {
                x: pos.x,
                y: pos.y,
                z: pos.z,
                qx: quat.x,
                qy: quat.y,
                qz: quat.z,
                qw: quat.w,
            };

            // Add joint values
            if (obj.joints) {
                for (const [jointName, channel] of Object.entries(obj.joints)) {
                    robotState[jointName] = evaluateChannel(channel, time, this.stateHistory);
                }
            }

            kinematicState[obj.id] = robotState;

            // Apply to Three.js object
            const obj3d = this.viewer.objects[obj.id] as Object3D;
            if (obj3d) {
                obj3d.position.set(pos.x, pos.y, pos.z);
                obj3d.quaternion.set(quat.x, quat.y, quat.z, quat.w);

                // Apply joints (for URDF models)
                if (obj.joints && obj3d.userData.joints) {
                    for (const [jointName, channel] of Object.entries(obj.joints)) {
                        const jointValue = evaluateChannel(channel, time, this.stateHistory);
                        const joint = obj3d.userData.joints[jointName];
                        if (joint) {
                            joint.setJointValue(jointValue);
                        }
                    }
                }

                obj3d.updateMatrix();
                obj3d.updateMatrixWorld();
            }
        }

        // Update state and mark viewer as dirty
        this.state = kinematicState;
        this.viewer.dirty = true;
    }

    /**
     * Override ready to indicate when state history is available
     */
    get ready(): boolean {
        return this.stateHistory !== undefined && this.stateHistory.length > 0;
    }
}
