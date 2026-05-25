import { useEffect, useState } from 'react';

import { LoadingManager, Viewer } from '@gov.nasa.jpl.honeycomb/core';

import {
    FocusCamViewerMixin,
    LightingViewerMixin,
    TransformControlsViewerMixin,
    ViewCubeViewerMixin
} from '@gov.nasa.jpl.honeycomb/scene-viewers';

import {
    type HoneycombContextState,
    App as HoneycombApp,
    initializeViewer,
} from '@gov.nasa.jpl.honeycomb/ui';

import { GrafanaKinematicsAnimator } from '../honeycomb/KinematicsAnimator';
import { GrafanaAnnotationsAnimator } from '../honeycomb/AnnotationsAnimator';
import { FrameTrajectoriesDriver } from '../honeycomb/FrameTrajectoriesDriver';
import { GrafanaHoneycombContext, GrafanaHoneycombContextState } from './Context';
import { annotationRegistry } from '../module';

export class GrafanaHoneycombViewer extends
    ViewCubeViewerMixin(
        FocusCamViewerMixin(
            TransformControlsViewerMixin(
                LightingViewerMixin(Viewer))))
{
}

export const App: React.FC<React.PropsWithChildren<{}>> = ({ children }) => {
    const [honeycombContext, setHoneycombContext] = useState<HoneycombContextState>();
    const [grafanaHoneycombContext, setGrafanaHoneycombContext] = useState<GrafanaHoneycombContextState>();

    useEffect(() => {
        const manager = new LoadingManager();
        const viewer = new GrafanaHoneycombViewer();

        // Initialize common viewer setup (BVH, loaders, drivers)
        const { kinematicsDriver, annotationsDriver } = initializeViewer(viewer, manager);

        const kinematicsAnimator = new GrafanaKinematicsAnimator();
        const annotationsAnimator = new GrafanaAnnotationsAnimator(annotationRegistry);
        const frameTrajectoriesDriver = new FrameTrajectoriesDriver(viewer, kinematicsAnimator);

        viewer.addAnimator(kinematicsAnimator, 'kinematics');
        viewer.addAnimator(annotationsAnimator, 'annotations');

        // TODO(tumbar) Remove. This is just for debugging purposes
        (window as any).viewer = viewer;

        setHoneycombContext({ viewer, manager, annotations: annotationRegistry });
        setGrafanaHoneycombContext({
            drivers: {
                kinematics: kinematicsDriver,
                frameTrajectories: frameTrajectoriesDriver,
                annotations: annotationsDriver
            },
            animators: {
                kinematics: kinematicsAnimator,
                annotations: annotationsAnimator
            }
        });
    }, []);

    if (!honeycombContext || !grafanaHoneycombContext) {
        return null;
    }

    return (
        <HoneycombApp {...honeycombContext}>
            <GrafanaHoneycombContext.Provider value={grafanaHoneycombContext}>
                {children}
            </GrafanaHoneycombContext.Provider>
        </HoneycombApp>
    )
}
