import React, { useState, useCallback } from 'react';
import { Object3D } from 'three';
import type { ObjectSettingsProvider, ObjectSettingsProps } from '../../../../common/plugins';
import type { Position, Orientation, KinematicChannel, ChannelType, OrientationConvention } from '@gov.nasa.jpl.honeycomb/core';
import { Label } from '../../../components/ui/label';
import { Input } from '../../../components/ui/input';
import { Separator } from '../../../components/ui/separator';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../../../components/ui/accordion';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { Checkbox } from '../../../components/ui/checkbox';
import { Box } from 'lucide-react';

interface ChannelEditorProps {
    label: string;
    channel: KinematicChannel;
    onChange: (updates: Partial<KinematicChannel>) => void;
}

function ChannelEditor({ label, channel, onChange }: ChannelEditorProps) {
    const isAnimated = channel?.type === 1; // ChannelType.animated

    const handleToggleAnimated = (checked: boolean) => {
        onChange({
            type: checked ? 1 : 0, // ChannelType.animated : ChannelType.constant
            field: checked ? '' : undefined,
        });
    };

    const handleValueChange = (value: number) => {
        onChange({ value });
    };

    const handleFieldChange = (field: string) => {
        onChange({ field });
    };

    const handleInterpolateChange = (checked: boolean) => {
        onChange({ interpolate: checked });
    };

    return (
        <div className="space-y-2 p-3 border rounded-md">
            <div className="flex items-center justify-between">
                <Label className="text-xs font-medium">{label}</Label>
                <div className="flex items-center gap-2">
                    <Label htmlFor={`${label}-animated`} className="text-xs">Animate</Label>
                    <Checkbox
                        id={`${label}-animated`}
                        checked={isAnimated}
                        onCheckedChange={handleToggleAnimated}
                    />
                </div>
            </div>

            <div className="space-y-2">
                <div className="flex items-center gap-2">
                    <Label className="text-xs text-muted-foreground w-16">
                        {isAnimated ? 'Fallback' : 'Value'}
                    </Label>
                    <Input
                        type="number"
                        value={channel?.value ?? 0}
                        onChange={(e) => handleValueChange(parseFloat(e.target.value) || 0)}
                        className="h-7 text-xs flex-1"
                        step="0.1"
                    />
                </div>

                {isAnimated && (
                    <>
                        <div className="flex items-center gap-2">
                            <Label className="text-xs text-muted-foreground w-16">Field</Label>
                            <Input
                                value={channel?.field ?? ''}
                                onChange={(e) => handleFieldChange(e.target.value)}
                                className="h-7 text-xs flex-1"
                                placeholder="Data field name"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <Label htmlFor={`${label}-interpolate`} className="text-xs text-muted-foreground">
                                Interpolate
                            </Label>
                            <Checkbox
                                id={`${label}-interpolate`}
                                checked={channel?.interpolate ?? false}
                                onCheckedChange={handleInterpolateChange}
                            />
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

function ObjectSettingsComponent({ object, rsfObject, onRsfChange }: ObjectSettingsProps) {
    const [name, setName] = useState(rsfObject?.name || '');

    if (!rsfObject) {
        return (
            <div className="p-4 text-sm text-muted-foreground">
                No RSF object data available
            </div>
        );
    }

    const handleNameChange = (newName: string) => {
        setName(newName);
        object.name = newName;
        onRsfChange?.({ name: newName });
    };

    const handlePositionChannelChange = (axis: 'x' | 'y' | 'z', updates: Partial<KinematicChannel>) => {
        const newPosition = {
            ...rsfObject.position,
            [axis]: {
                ...rsfObject.position[axis],
                ...updates
            }
        };
        onRsfChange?.({ position: newPosition });
    };

    const handleOrientationChannelChange = (axis: 'x' | 'y' | 'z' | 'w', updates: Partial<KinematicChannel>) => {
        const newOrientation = {
            ...rsfObject.orientation,
            [axis]: {
                ...rsfObject.orientation[axis],
                ...updates
            }
        };
        onRsfChange?.({ orientation: newOrientation });
    };

    const handleOrientationConventionChange = (convention: string) => {
        const typeMap: Record<string, number> = {
            'rpy': 0,
            'hamilton': 1,
            'jpl': 2
        };
        onRsfChange?.({
            orientation: {
                ...rsfObject.orientation,
                type: typeMap[convention]
            }
        });
    };

    const orientationConvention = ['rpy', 'hamilton', 'jpl'][rsfObject.orientation?.type ?? 2];
    const showW = orientationConvention !== 'rpy';

    return (
        <div className="p-3 space-y-4">
            {/* Name */}
            <div className="space-y-2">
                <Label htmlFor="object-name" className="text-xs font-medium">
                    Name
                </Label>
                <Input
                    id="object-name"
                    value={name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    className="h-8 text-sm"
                    placeholder="Object name"
                />
            </div>

            <Separator />

            {/* Transform */}
            <Accordion type="single" collapsible defaultValue="transform">
                <AccordionItem value="transform">
                    <AccordionTrigger className="text-xs font-medium">Transform</AccordionTrigger>
                    <AccordionContent className="space-y-4 pt-2">
                        {/* Position */}
                        <div className="space-y-2">
                            <Label className="text-sm font-semibold">Position</Label>
                            <ChannelEditor
                                label="X"
                                channel={rsfObject.position?.x}
                                onChange={(updates) => handlePositionChannelChange('x', updates)}
                            />
                            <ChannelEditor
                                label="Y"
                                channel={rsfObject.position?.y}
                                onChange={(updates) => handlePositionChannelChange('y', updates)}
                            />
                            <ChannelEditor
                                label="Z"
                                channel={rsfObject.position?.z}
                                onChange={(updates) => handlePositionChannelChange('z', updates)}
                            />
                        </div>

                        <Separator />

                        {/* Orientation */}
                        <div className="space-y-2">
                            <Label className="text-sm font-semibold">Orientation</Label>

                            <div className="space-y-2">
                                <Label htmlFor="orientation-convention" className="text-xs text-muted-foreground">
                                    Convention
                                </Label>
                                <Select
                                    value={orientationConvention}
                                    onValueChange={handleOrientationConventionChange}
                                >
                                    <SelectTrigger id="orientation-convention" className="h-8 text-sm">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="jpl">JPL (ij = k)</SelectItem>
                                        <SelectItem value="hamilton">Hamilton (ij = -k)</SelectItem>
                                        <SelectItem value="rpy">RPY (Euler angles)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <ChannelEditor
                                label="X"
                                channel={rsfObject.orientation?.x}
                                onChange={(updates) => handleOrientationChannelChange('x', updates)}
                            />
                            <ChannelEditor
                                label="Y"
                                channel={rsfObject.orientation?.y}
                                onChange={(updates) => handleOrientationChannelChange('y', updates)}
                            />
                            <ChannelEditor
                                label="Z"
                                channel={rsfObject.orientation?.z}
                                onChange={(updates) => handleOrientationChannelChange('z', updates)}
                            />
                            {showW && (
                                <ChannelEditor
                                    label="W"
                                    channel={rsfObject.orientation?.w}
                                    onChange={(updates) => handleOrientationChannelChange('w', updates)}
                                />
                            )}
                        </div>
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
        </div>
    );
}

export const Object3DSettingsProvider: ObjectSettingsProvider = {
    id: 'core-object',
    name: 'Properties',
    icon: 'Box',
    canHandle: (object: Object3D) => {
        // Core settings apply to all objects
        return true;
    },
    SettingsComponent: ObjectSettingsComponent,
};
