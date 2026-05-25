import React, { useEffect, useState } from "react";
import { LoadingManager, Scene, Viewer, SceneOptions } from "@gov.nasa.jpl.honeycomb/core";

import {
    type HoneycombContextState,
    App as HoneycombApp,
    VideoPlayer,
    useHoneycomb,
    VideoPlayerBarProps,
    SceneLoader,
    initializeViewer,
} from '@gov.nasa.jpl.honeycomb/ui';

import {
    FocusCamViewerMixin,
    LightingViewerMixin,
    TightShadowViewerMixin,
    TransformControlsViewerMixin,
    ViewCubeViewerMixin
} from "@gov.nasa.jpl.honeycomb/scene-viewers";

import { resolveProtocolUriSync, isProtocolUri } from './vscodeApi';
import { applyOptionsToViewer } from './applyOptions';
import { VscodeKinematicsAnimator } from './VscodeKinematicsAnimator';
import { StateSnapshot } from '../common/rsf';

export class VscodeHoneycombViewer extends
    ViewCubeViewerMixin(
        FocusCamViewerMixin(
            TransformControlsViewerMixin(
                TightShadowViewerMixin(Viewer))))
{
}

export const App: React.FC<React.PropsWithChildren<{}>> = ({ children }) => {
    const [honeycombContext, setHoneycombContext] = useState<HoneycombContextState>();

    useEffect(() => {
        const manager = new LoadingManager();

        // Set up URL modifier to synchronously resolve protocol URIs
        manager.setURLModifier((url: string) => {
            if (isProtocolUri(url)) {
                const resolved = resolveProtocolUriSync(url);
                return resolved;
            }
            return url;
        });

        const viewer = new VscodeHoneycombViewer();

        // Initialize common viewer setup (BVH, loaders, drivers)
        initializeViewer(viewer, manager);

        const kinematicsAnimator = new VscodeKinematicsAnimator(viewer);
        // const annotationsAnimator = new VscodeAnnotationsAnimator();
        viewer.addAnimator(kinematicsAnimator, 'kinematics');
        // viewer.addAnimator(annotationsAnimator, 'annotations');

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
    stateHistory?: StateSnapshot[];
}

interface HoneycombInnerProps extends HoneycombProps {
    containerRef: Element;
}

const VideoPlayerBar: React.FC<VideoPlayerBarProps> = () => {
    return null;
}

const HoneycombInner: React.FC<HoneycombInnerProps> = ({
    containerRef,
    options,
    scene,
    stateHistory,
}) => {
    const { viewer } = useHoneycomb<VscodeHoneycombViewer>();

    useEffect(() => {
        // Apply scene options to viewer
        if (options) {
            applyOptionsToViewer(options, viewer);
        }

        // Default settings
        viewer.controls.enableKeys = false;
        viewer.dirty = true;
    }, [viewer, options]);

    // Update animator with scene and state history
    useEffect(() => {
        const animator = viewer.animators.kinematics as VscodeKinematicsAnimator;
        if (animator) {
            animator.setScene(scene);
        }
    }, [viewer, scene]);

    useEffect(() => {
        const animator = viewer.animators.kinematics as VscodeKinematicsAnimator;
        if (animator) {
            animator.setStateHistory(stateHistory);
        }
    }, [viewer, stateHistory]);

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

export const HoneycombPanel: React.FC<HoneycombPanelProps> = ({ scene, options, stateHistory }) => {
    const [containerRef, setContainerRef] = useState<Element | null>(null);

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
                <SceneLoader scene={scene} />
                {containerRef && (
                    <HoneycombInner
                        scene={scene}
                        options={options}
                        stateHistory={stateHistory}
                        containerRef={containerRef}
                    />
                )}
            </App>
        </div>
    );
};
