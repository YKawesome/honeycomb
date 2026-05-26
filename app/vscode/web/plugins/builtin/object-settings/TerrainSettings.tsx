import React, { useState, useEffect } from 'react';
import { Object3D, Mesh } from 'three';
import { isTerrain } from '@gov.nasa.jpl.honeycomb/core';
import type { ObjectSettingsProvider, ObjectSettingsProps } from '../../../../common/plugins';
import { Label } from '../../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { Input } from '../../../components/ui/input';
import { Separator } from '../../../components/ui/separator';
import { Mountain } from 'lucide-react';

enum TerrainRenderingType {
    DEM = 'DEM',
    ORTHOPHOTO = 'Orthophoto',
}

enum TerrainOverlayType {
    NONE = 'None',
    TOPO_LINES = 'Topographic Lines',
    SLOPE = 'Slope Map'
}

function TerrainSettingsComponent({ object, viewer, onChange }: ObjectSettingsProps) {
    const [renderingMode, setRenderingMode] = useState<TerrainRenderingType>(
        object.userData.renderingMode || TerrainRenderingType.ORTHOPHOTO
    );
    const [overlayMode, setOverlayMode] = useState<TerrainOverlayType>(
        object.userData.overlayMode || TerrainOverlayType.NONE
    );
    const [maxSlopeAngle, setMaxSlopeAngle] = useState<number>(
        object.userData.maxSlopeAngle || 30
    );
    const [opacity, setOpacity] = useState<number>(
        object.userData.opacity || 1
    );

    const updateTerrainMaterial = (updates: {
        renderingMode?: TerrainRenderingType;
        overlayMode?: TerrainOverlayType;
        maxSlopeAngle?: number;
        opacity?: number;
    }) => {
        object.traverse(obj => {
            const material: any = (obj as Mesh).material;
            if (material?.defines) {
                if (updates.renderingMode !== undefined) {
                    material.defines.ENABLE_TEXTURE_STAMP = updates.renderingMode === TerrainRenderingType.ORTHOPHOTO ? 1 : 0;
                }
                if (updates.overlayMode !== undefined) {
                    material.defines.ENABLE_TOPO_LINES = updates.overlayMode === TerrainOverlayType.TOPO_LINES ? 1 : 0;
                    material.defines.ENABLE_SLOPE_ANGLE_VISUALIZATION = updates.overlayMode === TerrainOverlayType.SLOPE ? 1 : 0;
                }
                if (updates.maxSlopeAngle !== undefined) {
                    material.maxDotProduct = Math.cos(updates.maxSlopeAngle * Math.PI / 180);
                }
                if (updates.opacity !== undefined) {
                    material.opacity = updates.opacity;
                }
                material.needsUpdate = true;
            }
        });
        (viewer as any).dirty = true;
        onChange?.();
    };

    const handleRenderingModeChange = (value: string) => {
        const mode = value as TerrainRenderingType;
        setRenderingMode(mode);
        object.userData.renderingMode = mode;
        updateTerrainMaterial({ renderingMode: mode });
    };

    const handleOverlayModeChange = (value: string) => {
        const mode = value as TerrainOverlayType;
        setOverlayMode(mode);
        object.userData.overlayMode = mode;
        updateTerrainMaterial({ overlayMode: mode });
    };

    const handleMaxSlopeAngleChange = (value: number) => {
        setMaxSlopeAngle(value);
        object.userData.maxSlopeAngle = value;
        updateTerrainMaterial({ maxSlopeAngle: value });
    };

    const handleOpacityChange = (value: number) => {
        setOpacity(value);
        object.userData.opacity = value;
        updateTerrainMaterial({ opacity: value });
    };

    return (
        <div className="space-y-4">
            {/* Rendering Mode */}
            <div className="space-y-2">
                <Label htmlFor="rendering-mode" className="text-xs font-medium">
                    Rendering Mode
                </Label>
                <Select value={renderingMode} onValueChange={handleRenderingModeChange}>
                    <SelectTrigger id="rendering-mode" className="h-8 text-sm">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value={TerrainRenderingType.DEM}>DEM</SelectItem>
                        <SelectItem value={TerrainRenderingType.ORTHOPHOTO}>Orthophoto</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <Separator />

            {/* Overlay Mode */}
            <div className="space-y-2">
                <Label htmlFor="overlay-mode" className="text-xs font-medium">
                    Overlay Mode
                </Label>
                <Select value={overlayMode} onValueChange={handleOverlayModeChange}>
                    <SelectTrigger id="overlay-mode" className="h-8 text-sm">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value={TerrainOverlayType.NONE}>None</SelectItem>
                        <SelectItem value={TerrainOverlayType.TOPO_LINES}>Topographic Lines</SelectItem>
                        <SelectItem value={TerrainOverlayType.SLOPE}>Slope Map</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Slope Map Settings */}
            {overlayMode === TerrainOverlayType.SLOPE && (
                <>
                    <Separator />
                    <div className="space-y-2">
                        <Label htmlFor="max-slope" className="text-xs font-medium">
                            Max Slope Angle (degrees)
                        </Label>
                        <Input
                            id="max-slope"
                            type="number"
                            value={maxSlopeAngle}
                            onChange={(e) => handleMaxSlopeAngleChange(parseFloat(e.target.value) || 0)}
                            className="h-8 text-sm"
                            min={0}
                            max={90}
                            step={1}
                        />
                        <p className="text-xs text-muted-foreground">
                            Slope angles ≥ {maxSlopeAngle}° shown in red
                        </p>
                    </div>
                </>
            )}

            <Separator />

            {/* Opacity */}
            <div className="space-y-2">
                <Label htmlFor="opacity" className="text-xs font-medium">
                    Opacity
                </Label>
                <Input
                    id="opacity"
                    type="number"
                    value={opacity}
                    onChange={(e) => handleOpacityChange(parseFloat(e.target.value) || 0)}
                    className="h-8 text-sm"
                    min={0}
                    max={1}
                    step={0.01}
                />
            </div>
        </div>
    );
}

export const TerrainSettingsProvider: ObjectSettingsProvider = {
    id: 'terrain',
    name: 'Terrain',
    icon: 'Mountain',
    canHandle: (object: Object3D) => {
        return isTerrain(object);
    },
    SettingsComponent: TerrainSettingsComponent,
};
