import {
    SceneObject,
    Position,
    Orientation,
    ChannelType,
    OrientationConvention,
    KinematicChannel,
} from '@gov.nasa.jpl.honeycomb/core';

/**
 * Generates a unique ID for scene objects
 */
export function generateSceneObjectId(): string {
    return `obj-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create a constant kinematic channel
 */
function createConstantChannel(value: number): KinematicChannel {
    return {
        type: ChannelType.constant,
        interpolate: false,
        value,
    };
}

/**
 * Create default position channels (origin)
 */
function createDefaultPosition(): Position {
    return {
        x: createConstantChannel(0),
        y: createConstantChannel(0),
        z: createConstantChannel(0),
    };
}

/**
 * Create default orientation channels (identity quaternion: w=1)
 */
function createDefaultOrientation(): Orientation {
    return {
        type: OrientationConvention.jpl, // XYZW
        x: createConstantChannel(0),
        y: createConstantChannel(0),
        z: createConstantChannel(0),
        w: createConstantChannel(1), // Identity quaternion
    };
}

/**
 * Ensures all scene objects have valid IDs
 */
export function ensureSceneObjectIds(scene: SceneObject[]): SceneObject[] {
    return scene.map((obj) => {
        if (!obj.id || obj.id === '') {
            return {
                ...obj,
                id: generateSceneObjectId(),
            };
        }
        return obj;
    });
}

/**
 * Creates a default scene object with all required fields (RSF 2.0 format)
 */
export function createDefaultSceneObject(type: 'model' | 'frame' | 'annotation'): Partial<SceneObject> {
    const baseObject = {
        id: generateSceneObjectId(),
        name: 'Unnamed Object',
        position: createDefaultPosition(),
        orientation: createDefaultOrientation(),
        parent: null,
    };

    switch (type) {
        case 'model':
            return {
                ...baseObject,
                type: 'model',
                model: {
                    path: '',
                },
            };
        case 'frame':
            return {
                ...baseObject,
                type: 'frame',
            };
        case 'annotation':
            return {
                ...baseObject,
                type: 'annotation',
                annotation: {
                    type: '',
                    options: {},
                },
            };
    }
}
