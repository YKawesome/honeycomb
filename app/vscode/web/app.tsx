import React, { useEffect, useState } from "react";
import { LoadingManager, Scene, Viewer, SceneOptions } from "@gov.nasa.jpl.honeycomb/core";

import {
    AnnotationDriver,
    KinematicsDriver,
    registerCommonLoaders
} from "@gov.nasa.jpl.honeycomb/extensions";

import { Mesh, BufferGeometry, FileLoader } from 'three';
import {
    computeBoundsTree,
    disposeBoundsTree,
    acceleratedRaycast
} from 'three-mesh-bvh';

import {
    type HoneycombContextState,
    App as HoneycombApp,
    VideoPlayer,
    useHoneycomb,
    VideoPlayerBarProps,
    SceneLoader,
} from '@gov.nasa.jpl.honeycomb/ui';

import {
    FocusCamViewerMixin,
    LightingViewerMixin,
    TransformControlsViewerMixin,
    ViewCubeViewerMixin
} from "@gov.nasa.jpl.honeycomb/scene-viewers";

import { resolveProtocolUri, isProtocolUri } from './vscodeApi';
import { applyOptionsToViewer } from './applyOptions';

// Patch Three.js FileLoader to resolve protocol URIs
function patchThreeFileLoader() {
    const originalLoad = FileLoader.prototype.load;

    FileLoader.prototype.load = function(
        url: string,
        onLoad?: (data: string | ArrayBuffer) => void,
        onProgress?: (event: ProgressEvent) => void,
        onError?: (error: unknown) => void
    ) {
        console.log(`[FileLoader] Load called with URL: ${url}`);
        console.log(`[FileLoader] Is protocol URI?`, isProtocolUri(url));

        // Check if URL needs resolution
        if (isProtocolUri(url)) {
            console.log(`[FileLoader] Resolving protocol URI: ${url}`);

            resolveProtocolUri(url).then(
                (resolved) => {
                    if (resolved.webviewUri) {
                        console.log(`[FileLoader] Resolved ${url} -> ${resolved.webviewUri}`);
                        originalLoad.call(this, resolved.webviewUri, onLoad, onProgress, onError);
                    } else {
                        const error = new Error(`Failed to resolve protocol URI: ${url}`);
                        console.error('[FileLoader]', error);
                        if (onError) {
                            onError(error);
                        }
                    }
                },
                (error) => {
                    console.error(`[FileLoader] Error resolving ${url}:`, error);
                    if (onError) {
                        onError(error);
                    }
                }
            );
        } else {
            console.log(`[FileLoader] Calling original load for: ${url}`);
            // Call original load for non-protocol URIs
            originalLoad.call(this, url, onLoad, onProgress, onError);
        }
    };
}

// Patch immediately when module loads
patchThreeFileLoader();

export class VscodeHoneycombViewer extends
    ViewCubeViewerMixin(
        FocusCamViewerMixin(
            TransformControlsViewerMixin(
                LightingViewerMixin(Viewer))))
{
}

export const App: React.FC<React.PropsWithChildren<{}>> = ({ children }) => {
    const [honeycombContext, setHoneycombContext] = useState<HoneycombContextState>();

    useEffect(() => {
        const manager = new LoadingManager();
        const viewer = new VscodeHoneycombViewer();

        const kinematicsDriver = new KinematicsDriver();
        const annotationsDriver = new AnnotationDriver(manager);
        // const kinematicsAnimator = new GrafanaKinematicsAnimator();
        // const annotationsAnimator = new GrafanaAnnotationsAnimator(annotationRegistry);
        // const frameTrajectoriesDriver = new FrameTrajectoriesDriver(viewer, kinematicsAnimator);

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

        registerCommonLoaders();

        viewer.addDriver(kinematicsDriver, 'kinematics');
        viewer.addDriver(annotationsDriver, 'annotations');

        // viewer.addAnimator(kinematicsAnimator, 'kinematics');
        // viewer.addAnimator(annotationsAnimator, 'annotations');
        viewer.animator.setTime(viewer.animator.startTime);

        // Load all settings and files from the lineage of configs
        viewer.renderer.setClearColor("#000", 0);
        viewer.getCamera().position.set(2, 2, 2);
        viewer.controls.enableKeys = false;

        // TODO(tumbar) Remove. This is just for debugging purposes
        (window as any).viewer = viewer;

        setHoneycombContext({ viewer, manager });
    }, []);

    if (!honeycombContext) {
        return null;
    }

    return (
        <HoneycombApp {...honeycombContext}>
            {children}
        </HoneycombApp>
    )
}

interface HoneycombProps {
    scene: Scene;
    options?: SceneOptions;
}

interface HoneycombInnerProps extends HoneycombProps {
    containerRef: Element;
}

const VideoPlayerBar: React.FC<VideoPlayerBarProps> = () => {
    return null;
}

const HoneycombInner: React.FC<HoneycombInnerProps> = ({
    containerRef,
    scene,
    options,
}) => {
    const { viewer } = useHoneycomb();

    useEffect(() => {
        // Apply scene options to viewer
        if (options) {
            console.log('[HoneycombInner] Applying options to viewer:', options);
            applyOptionsToViewer(options, viewer);
        }

        // Default settings
        viewer.controls.enableKeys = false;
        viewer.dirty = true;
    }, [viewer, options]);

    return (
        <VideoPlayer
            viewer={viewer}
            container={containerRef}
            PlayerBar={VideoPlayerBar}
        />
    );
};

interface HoneycombPanelProps extends HoneycombProps {
}

export const HoneycombPanel: React.FC<HoneycombPanelProps> = (props) => {
    const [containerRef, setContainerRef] = useState<Element | null>(null);

    console.log('[HoneycombPanel] Rendering with scene:', props.scene, 'options:', props.options);
    console.log('[HoneycombPanel] Scene array length:', props.scene?.length);
    console.log('[HoneycombPanel] Scene objects:', JSON.stringify(props.scene, null, 2));
    console.log('[HoneycombPanel] Scene types:', props.scene?.map(obj => obj.type));
    console.log('[HoneycombPanel] Model objects:', props.scene?.filter(obj => obj.type === 'model'));

    return (
        <div
            ref={(r) => setContainerRef(r)}
            style={{
                width: "100%",
                height: "100%",
                display: "flex"
            }}
        >
            <App>
                <SceneLoader scene={props.scene} />
                {containerRef && (
                    <HoneycombInner
                        {...props}
                        containerRef={containerRef}
                    />
                )}
            </App>
        </div>
    );
};
