import { SceneObject } from '@gov.nasa.jpl.honeycomb/core';

/**
 * Transforms RSF scene objects to SceneObject format expected by SceneLoader
 */
export function transformRsfToSceneObjects(rsfScene: any[]): SceneObject[] {
    // First pass: build name-to-id map
    const nameToIdMap = new Map<string, string>();
    rsfScene.forEach((obj) => {
        if (obj.name && obj.id) {
            nameToIdMap.set(obj.name, obj.id);
        }
    });

    // Second pass: transform objects
    return rsfScene.map((obj) => {
        const transformed: any = {
            ...obj,
        };

        // Transform pose to position/orientation if needed
        if (obj.pose) {
            transformed.position = obj.pose.position || [0, 0, 0];
            transformed.orientation = obj.pose.orientation || [0, 0, 0, 1];
            delete transformed.pose;
        }

        // Ensure position/orientation exist
        if (!transformed.position) {
            transformed.position = [0, 0, 0];
        }
        if (!transformed.orientation) {
            transformed.orientation = [0, 0, 0, 1];
        }

        // Transform frame array to parent ID
        if (obj.frame && Array.isArray(obj.frame) && obj.frame.length > 0) {
            // Take the last frame in the path as the immediate parent name
            const parentName = obj.frame[obj.frame.length - 1];
            // Convert parent name to parent ID
            const parentId = nameToIdMap.get(parentName);
            if (parentId) {
                transformed.parent = parentId;
            }
        }

        return transformed as SceneObject;
    });
}
