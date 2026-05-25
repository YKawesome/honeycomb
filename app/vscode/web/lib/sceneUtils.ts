import { SceneObject } from '@gov.nasa.jpl.honeycomb/core';

/**
 * Generates a unique ID for scene objects
 */
export function generateSceneObjectId(): string {
    return `obj-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
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
 * Creates a default scene object with all required fields
 */
export function createDefaultSceneObject(type: 'model' | 'frame' | 'annotation'): Partial<SceneObject> {
    const baseObject = {
        id: generateSceneObjectId(),
        name: 'Unnamed Object',
        position: [0, 0, 0] as [number, number, number],
        orientation: [0, 0, 0, 1] as [number, number, number, number],
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
