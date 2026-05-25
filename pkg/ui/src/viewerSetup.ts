import { Mesh, BufferGeometry } from 'three';
import {
    computeBoundsTree,
    disposeBoundsTree,
    acceleratedRaycast
} from 'three-mesh-bvh';

import { LoadingManager, Viewer } from '@gov.nasa.jpl.honeycomb/core';
import {
    AnnotationDriver,
    KinematicsDriver,
    registerCommonLoaders
} from '@gov.nasa.jpl.honeycomb/extensions';

/**
 * Common viewer initialization shared between Grafana and VSCode
 *
 * Sets up:
 * - BVH raycasting optimization for terrains
 * - Common loaders (URDF, FBX, etc.)
 * - Kinematics and annotation drivers
 * - Default viewer settings
 */
export function initializeViewer(viewer: Viewer, manager: LoadingManager) {
    // Using three-mesh-bvh can help speed up terrain raycasts immensely for
    // large terrains. For example, on a terrain with 7.5M vertices and 15M faces,
    // normal raycasts took over 1100ms but the sped-up version took under 1ms.
    // Note that computeBoundsTree() must be called one time on the geometry prior
    // to any raycasts (not for each raycast), otherwise the normal three raycast
    // function will be used. We are now calling computeBoundsTree() on loaded
    // objects by default. Here are some typical timings on computeBoundsTree():
    // - .stl terrain with 7.5M vertices, 15M faces -- 6.8 seconds
    // - .obj terrain with 500K vertices, 996K faces -- 340ms
    // - small .stl mesh files for a rover -- all under 22ms
    // See also:
    // - honeycomb/modules/honeycomb/src/Loaders.ts
    // - useOptimizedRaycast option in ModelObject in
    //   honeycomb/modules/honeycomb/src/scene.ts
    (BufferGeometry.prototype as any).computeBoundsTree = computeBoundsTree;
    (BufferGeometry.prototype as any).disposeBoundsTree = disposeBoundsTree;
    Mesh.prototype.raycast = acceleratedRaycast;

    // Register common loaders (URDF, FBX, OBJ, etc.)
    registerCommonLoaders();

    // Create drivers
    const kinematicsDriver = new KinematicsDriver();
    const annotationsDriver = new AnnotationDriver(manager);

    viewer.addDriver(kinematicsDriver, 'kinematics');
    viewer.addDriver(annotationsDriver, 'annotations');

    // Default viewer settings
    viewer.renderer.setClearColor("#000", 0);
    viewer.getCamera().position.set(2, 2, 2);
    viewer.controls.enableKeys = false;
    viewer.animator.setTime(viewer.animator.startTime);

    return {
        kinematicsDriver,
        annotationsDriver,
    };
}
