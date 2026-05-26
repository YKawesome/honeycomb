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
    PlayerBarHoverContext,
} from '@gov.nasa.jpl.honeycomb/ui';

import {
    FocusCamViewerMixin,
    TightShadowViewerMixin,
    TransformControlsViewerMixin,
    ViewCubeViewerMixin
} from "@gov.nasa.jpl.honeycomb/scene-viewers";

import { resolveProtocolUriSync, isProtocolUri, resolveRelativePathSync, isRelativePath } from './vscodeApi';
import { applyOptionsToViewer } from './applyOptions';
import { VscodeKinematicsAnimator } from './VscodeKinematicsAnimator';
import { StateSnapshot } from '../common/rsf';
import { Button } from './components/ui/button';
import { Slider } from './components/ui/slider';
import { Play, Pause, Square, Circle } from 'lucide-react';

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

        // Set up URL modifier to synchronously resolve protocol URIs and relative paths
        manager.setURLModifier((url: string) => {
            console.log('[URLModifier] Input URL:', url);

            // Handle protocol URIs (e.g., package://...)
            if (isProtocolUri(url)) {
                const resolved = resolveProtocolUriSync(url);
                console.log('[URLModifier] Protocol URI resolved:', url, '->', resolved);
                return resolved;
            }

            // Handle relative paths - resolve relative to RSF file
            if (isRelativePath(url)) {
                const resolved = resolveRelativePathSync(url);
                console.log('[URLModifier] Relative path resolved:', url, '->', resolved);
                return resolved;
            }

            console.log('[URLModifier] URL unchanged:', url);
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
    onViewerReady?: (viewer: VscodeHoneycombViewer) => void;
}

const EmptyPlayerBar: React.FC<VideoPlayerBarProps> = () => {
    return null;
}

const VideoPlayerBar: React.FC<VideoPlayerBarProps> = ({
    startTime,
    currTime,
    endTime,
    setTime,

    isPlaying,
    isLive,
    displayLive,

    left,
    right,
    top,
    bottom,

    onClickPlay,
    onClickStop,
    onClickLive,

    disabled,
}) => {
    const [hovering, setHovering] = React.useState(false);

    // Format time display
    const formatTime = (timestamp: number) => {
        const date = new Date(timestamp * 1000);
        return date.toLocaleTimeString('en-US', {
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    };

    const currentTimeStr = formatTime(currTime);
    const endTimeStr = formatTime(endTime);

    return (
        <div
            className="flex flex-col gap-0"
            onMouseEnter={() => setHovering(true)}
            onMouseLeave={() => setHovering(false)}
        >
            <PlayerBarHoverContext.Provider value={hovering}>
                {top}

                {/* Slider */}
                <div className="px-2 py-1">
                    <Slider
                        min={startTime}
                        max={endTime}
                        value={[currTime]}
                        onValueChange={(values: number[]) => setTime(values[0])}
                        disabled={disabled}
                        className="cursor-pointer"
                    />
                </div>

                {bottom}
            </PlayerBarHoverContext.Provider>

            {/* Control bar */}
            <div className="flex flex-row justify-between items-center gap-2 px-2 py-1">
                <div className="flex flex-row items-center gap-3">
                    <div className="flex flex-row items-center gap-1">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={onClickPlay}
                            disabled={disabled}
                            aria-label={isPlaying ? "Pause" : "Play"}
                        >
                            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={onClickStop}
                            disabled={disabled}
                            aria-label="Stop"
                        >
                            <Square className="h-4 w-4" />
                        </Button>
                        <span className="text-xs font-mono">
                            <span className="font-bold">{currentTimeStr}</span>
                            <span className="mx-1">:</span>
                            {endTimeStr}
                        </span>
                    </div>
                    {displayLive && (
                        <Button
                            variant={isLive ? "secondary" : "outline"}
                            size="sm"
                            className="h-7"
                            onClick={onClickLive}
                            disabled={isLive}
                        >
                            <Circle className="h-2 w-2 fill-current mr-1" />
                            Live
                        </Button>
                    )}
                    <div className="flex flex-row items-center gap-1">
                        {left}
                    </div>
                </div>
                <div className="flex flex-row items-center gap-1">
                    {right}
                </div>
            </div>
        </div>
    );
}

const HoneycombInner: React.FC<HoneycombInnerProps> = ({
    containerRef,
    options,
    scene,
    stateHistory,
    onViewerReady,
}) => {
    const { viewer } = useHoneycomb<VscodeHoneycombViewer>();

    // Notify parent when viewer is ready
    useEffect(() => {
        if (viewer && onViewerReady) {
            onViewerReady(viewer);
        }
    }, [viewer, onViewerReady]);

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

    const hasStateHistory = stateHistory && stateHistory.length > 0;

    return (
        <VideoPlayer
            viewer={viewer}
            container={containerRef}
            PlayerBar={hasStateHistory ? VideoPlayerBar : EmptyPlayerBar}
        />
    );
};

interface HoneycombPanelProps extends HoneycombProps {
    onViewerReady?: (viewer: VscodeHoneycombViewer) => void;
}

export const HoneycombPanel: React.FC<HoneycombPanelProps> = ({ scene, options, stateHistory, onViewerReady }) => {
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
                        onViewerReady={onViewerReady}
                    />
                )}
            </App>
        </div>
    );
};
