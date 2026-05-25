import { Vector3 } from 'three';
import { SceneOptions } from '@gov.nasa.jpl.honeycomb/core';

/**
 * Applies SceneOptions to a viewer instance
 * Based on app/grafana/src/honeycomb/utils.ts:applyOptionsToViewer
 */
export function applyOptionsToViewer(options: Partial<SceneOptions>, viewer: any) {
    console.log('[applyOptionsToViewer] Applying options:', options);
    console.log('[applyOptionsToViewer] Viewer before:', {
        directionalLightIntensity: viewer.directionalLight?.intensity,
        ambientLightIntensity: viewer.ambientLight?.intensity,
        gridVisibility: viewer.gridVisibility,
        up: viewer.world?.getUpDirection?.(),
    });

    // Playback speed
    if (options.playbackSpeed !== undefined) {
        viewer.playbackSpeed = options.playbackSpeed;
    }

    // Grid visibility
    if (options.gridVisibility !== undefined) {
        viewer.gridVisibility = options.gridVisibility;
    }

    // Up direction (orientation) - THIS IS KEY FOR CORRECT ORIENTATION
    if (options.up !== undefined) {
        console.log('[applyOptionsToViewer] Setting up direction to:', options.up);
        viewer.world.setUpDirection(options.up);
    }

    // View cube
    if (options.viewCube !== undefined) {
        viewer.viewCubeEnabled = options.viewCube;
    }

    // Lighting
    if (options.lightIntensity !== undefined) {
        console.log('[applyOptionsToViewer] Setting directional light intensity to:', options.lightIntensity);
        viewer.directionalLight.intensity = options.lightIntensity;
    }

    if (options.ambientLightIntensity !== undefined) {
        console.log('[applyOptionsToViewer] Setting ambient light intensity to:', options.ambientLightIntensity);
        viewer.ambientLight.intensity = options.ambientLightIntensity;
    }

    if (options.lightDirection) {
        const tempVec3 = new Vector3(
            options.lightDirection[0],
            options.lightDirection[1],
            options.lightDirection[2]
        );
        console.log('[applyOptionsToViewer] Setting sun direction to:', tempVec3);
        viewer.setSunDirection(tempVec3);
    }

    // Camera settings
    if (options.camera) {
        const camera = viewer.getCamera();

        if (options.camera.near !== undefined) {
            camera.near = options.camera.near;
        }

        if (options.camera.far !== undefined) {
            camera.far = options.camera.far;
        }

        if (options.camera.near !== undefined || options.camera.far !== undefined) {
            camera.updateProjectionMatrix();
        }
    }

    // Mark viewer as needing render update
    viewer.dirty = true;
}
