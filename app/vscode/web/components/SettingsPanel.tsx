import React from 'react';
import { Object3D } from 'three';
import { SceneOptions, Viewer } from '@gov.nasa.jpl.honeycomb/core';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';
import { ScrollArea } from './ui/scroll-area';
import { Checkbox } from './ui/checkbox';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { ObjectSettings } from './ObjectSettings';

interface SettingsPanelProps {
    options: Partial<SceneOptions>;
    onChange: (options: Partial<SceneOptions>) => void;
    selectedThreeObject?: Object3D | null;
    selectedRsfObject?: any | null;
    onRsfObjectChange?: (updates: any) => void;
    viewer?: Viewer;
}

export function SettingsPanel({
    options,
    onChange,
    selectedThreeObject,
    selectedRsfObject,
    onRsfObjectChange,
    viewer
}: SettingsPanelProps) {
    const handleChange = (key: keyof SceneOptions, value: any) => {
        onChange({ ...options, [key]: value });
    };

    // If an object is selected and we have a viewer, show object settings
    if (selectedThreeObject && selectedRsfObject && viewer) {
        return <ObjectSettings
            object={selectedThreeObject}
            rsfObject={selectedRsfObject}
            viewer={viewer}
            onRsfChange={onRsfObjectChange}
        />;
    }

    return (
        <div className="flex flex-col h-full border-r">
            <div className="flex items-center justify-between px-2 py-1.5 border-b bg-muted/50">
                <h3 className="text-xs font-semibold">Settings</h3>
            </div>
            <ScrollArea className="flex-1">
                <Accordion type="multiple" className="w-full" defaultValue={["display", "lighting", "camera"]}>
                    <AccordionItem value="display">
                        <AccordionTrigger className="px-2 py-1.5 text-xs">Display</AccordionTrigger>
                        <AccordionContent className="px-2 py-2">
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label>Grid Visibility</Label>
                                    <Checkbox
                                        checked={options.gridVisibility ?? true}
                                        onCheckedChange={(checked) => handleChange('gridVisibility', checked)}
                                    />
                                </div>
                                <div className="flex items-center justify-between">
                                    <Label>View Cube</Label>
                                    <Checkbox
                                        checked={options.viewCube ?? true}
                                        onCheckedChange={(checked) => handleChange('viewCube', checked)}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label>Up Direction</Label>
                                    <Select
                                        value={options.up ?? '+Z'}
                                        onValueChange={(value) => handleChange('up', value)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="+X">+X</SelectItem>
                                            <SelectItem value="-X">-X</SelectItem>
                                            <SelectItem value="+Y">+Y</SelectItem>
                                            <SelectItem value="-Y">-Y</SelectItem>
                                            <SelectItem value="+Z">+Z</SelectItem>
                                            <SelectItem value="-Z">-Z</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1">
                                    <Label>Playback Speed</Label>
                                    <Input
                                        type="number"
                                        value={options.playbackSpeed ?? 1}
                                        onChange={(e) => handleChange('playbackSpeed', parseFloat(e.target.value))}
                                        step="0.1"
                                        min="0"
                                        max="10"
                                    />
                                </div>
                            </div>
                        </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="lighting">
                        <AccordionTrigger className="px-2 py-1.5 text-xs">Lighting</AccordionTrigger>
                        <AccordionContent className="px-2 py-2">
                            <div className="space-y-2">
                                <div className="space-y-1">
                                    <Label>Light Intensity</Label>
                                    <Input
                                        type="number"
                                        value={options.lightIntensity ?? 1}
                                        onChange={(e) => handleChange('lightIntensity', parseFloat(e.target.value))}
                                        step="0.1"
                                        min="0"
                                        max="10"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label>Ambient Light Intensity</Label>
                                    <Input
                                        type="number"
                                        value={options.ambientLightIntensity ?? 0.5}
                                        onChange={(e) => handleChange('ambientLightIntensity', parseFloat(e.target.value))}
                                        step="0.1"
                                        min="0"
                                        max="10"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label>Light Direction</Label>
                                    <div className="grid grid-cols-3 gap-1">
                                        <Input
                                            type="number"
                                            value={options.lightDirection?.[0] ?? 1}
                                            onChange={(e) => handleChange('lightDirection', [
                                                parseFloat(e.target.value),
                                                options.lightDirection?.[1] ?? 1,
                                                options.lightDirection?.[2] ?? 1,
                                            ])}
                                            step="0.1"
                                            placeholder="X"
                                        />
                                        <Input
                                            type="number"
                                            value={options.lightDirection?.[1] ?? 1}
                                            onChange={(e) => handleChange('lightDirection', [
                                                options.lightDirection?.[0] ?? 1,
                                                parseFloat(e.target.value),
                                                options.lightDirection?.[2] ?? 1,
                                            ])}
                                            step="0.1"
                                            placeholder="Y"
                                        />
                                        <Input
                                            type="number"
                                            value={options.lightDirection?.[2] ?? 1}
                                            onChange={(e) => handleChange('lightDirection', [
                                                options.lightDirection?.[0] ?? 1,
                                                options.lightDirection?.[1] ?? 1,
                                                parseFloat(e.target.value),
                                            ])}
                                            step="0.1"
                                            placeholder="Z"
                                        />
                                    </div>
                                </div>
                            </div>
                        </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="camera">
                        <AccordionTrigger className="px-2 py-1.5 text-xs">Camera</AccordionTrigger>
                        <AccordionContent className="px-2 py-2">
                            <div className="space-y-2">
                                <div className="space-y-1">
                                    <Label>Near Plane</Label>
                                    <Input
                                        type="number"
                                        value={options.camera?.near ?? 0.01}
                                        onChange={(e) => handleChange('camera', {
                                            ...options.camera,
                                            near: parseFloat(e.target.value)
                                        })}
                                        step="0.01"
                                        min="0.001"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label>Far Plane</Label>
                                    <Input
                                        type="number"
                                        value={options.camera?.far ?? 10000}
                                        onChange={(e) => handleChange('camera', {
                                            ...options.camera,
                                            far: parseFloat(e.target.value)
                                        })}
                                        step="100"
                                        min="1"
                                    />
                                </div>
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            </ScrollArea>
        </div>
    );
}
