import React, { useCallback } from 'react';
import { Object3D } from 'three';
import type { ObjectSettingsProvider, ObjectSettingsProps } from '../../../../common/plugins';
import type { KinematicChannel } from '@gov.nasa.jpl.honeycomb/core';
import { Label } from '../../../components/ui/label';
import { Input } from '../../../components/ui/input';
import { Checkbox } from '../../../components/ui/checkbox';
import { Slider } from '../../../components/ui/slider';

const EFFECTIVELY_INFINITE_LIMIT = 1.79769e+308;

interface URDFJoint {
    name: string;
    jointType: 'fixed' | 'continuous' | 'revolute' | 'planar' | 'prismatic' | 'floating';
    jointValue: number[];
    ignoreLimits?: boolean;
    limit: {
        lower: number;
        upper: number;
    };
    setJointValue(...values: number[]): void;
}

interface URDFRobot extends Object3D {
    isURDFRobot: true;
    joints: { [key: string]: URDFJoint };
    setJointValue(jointName: string, ...values: number[]): boolean;
}

function isURDFRobot(object: Object3D): object is URDFRobot {
    return (object as any).isURDFRobot === true;
}

interface JointEditorProps {
    jointName: string;
    urdfJoint: URDFJoint;
    viewer: any;
    channel: KinematicChannel | undefined;
    onChange: (updates: Partial<KinematicChannel>) => void;
}

function JointEditor({ jointName, urdfJoint, viewer, channel, onChange }: JointEditorProps) {
    // Get current joint value from URDF
    const currentValue = urdfJoint.jointValue[0] ?? 0;

    // Use RSF channel if it exists, otherwise create a default constant channel
    const effectiveChannel: KinematicChannel = channel ?? {
        type: 0, // ChannelType.constant
        value: currentValue,
        interpolate: false,
    };

    const isAnimated = effectiveChannel.type === 1; // ChannelType.animated

    // Check if joint has valid limits
    const shouldIgnoreLimits = urdfJoint.ignoreLimits || urdfJoint.limit.lower >= urdfJoint.limit.upper;
    const hasLimits = !shouldIgnoreLimits &&
        urdfJoint.limit.lower > -EFFECTIVELY_INFINITE_LIMIT &&
        urdfJoint.limit.upper < EFFECTIVELY_INFINITE_LIMIT;

    const handleToggleAnimated = useCallback((checked: boolean) => {
        onChange({
            type: checked ? 1 : 0, // ChannelType.animated : ChannelType.constant
            value: currentValue,
            field: checked ? '' : undefined,
            interpolate: false,
        });
    }, [onChange, currentValue]);

    const handleValueChange = useCallback((value: number) => {
        // Update RSF channel
        onChange({ ...effectiveChannel, value });

        // Update URDF joint immediately for visual feedback
        urdfJoint.setJointValue(value);
        viewer.dirty = true;
    }, [onChange, effectiveChannel, urdfJoint, viewer]);

    const handleSliderChange = useCallback((values: number[]) => {
        handleValueChange(values[0]);
    }, [handleValueChange]);

    const handleFieldChange = useCallback((field: string) => {
        onChange({ ...effectiveChannel, field });
    }, [onChange, effectiveChannel]);

    const handleInterpolateChange = useCallback((checked: boolean) => {
        onChange({ ...effectiveChannel, interpolate: checked });
    }, [onChange, effectiveChannel]);

    return (
        <div className="space-y-2 p-2 border rounded-md bg-muted/30">
            <div className="flex items-center justify-between">
                <Label className="text-xs font-medium">{jointName}</Label>
                <div className="flex items-center gap-2">
                    <Label htmlFor={`${jointName}-animated`} className="text-xs text-muted-foreground">
                        Animate
                    </Label>
                    <Checkbox
                        id={`${jointName}-animated`}
                        checked={isAnimated}
                        onCheckedChange={handleToggleAnimated}
                    />
                </div>
            </div>

            <div className="space-y-2">
                <div className="flex items-center gap-2">
                    <Label className="text-xs text-muted-foreground w-20">
                        {isAnimated ? 'Fallback' : 'Angle'}
                    </Label>
                    <Input
                        type="number"
                        value={effectiveChannel.value ?? 0}
                        onChange={(e) => handleValueChange(parseFloat(e.target.value) || 0)}
                        className="h-7 text-xs flex-1"
                        step="0.01"
                    />
                    <span className="text-xs text-muted-foreground">rad</span>
                </div>

                {hasLimits && (
                    <div className="flex items-center gap-2">
                        <Label className="text-xs text-muted-foreground w-20">Slider</Label>
                        <Slider
                            min={urdfJoint.limit.lower}
                            max={urdfJoint.limit.upper}
                            step={0.01}
                            value={[effectiveChannel.value ?? 0]}
                            onValueChange={handleSliderChange}
                            className="flex-1"
                        />
                    </div>
                )}

                {isAnimated && (
                    <>
                        <div className="flex items-center gap-2">
                            <Label className="text-xs text-muted-foreground w-20">Field</Label>
                            <Input
                                value={effectiveChannel.field ?? ''}
                                onChange={(e) => handleFieldChange(e.target.value)}
                                className="h-7 text-xs flex-1"
                                placeholder="Data field name"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <Label htmlFor={`${jointName}-interpolate`} className="text-xs text-muted-foreground">
                                Interpolate
                            </Label>
                            <Checkbox
                                id={`${jointName}-interpolate`}
                                checked={effectiveChannel.interpolate ?? false}
                                onCheckedChange={handleInterpolateChange}
                            />
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

function RobotSettingsComponent({ object, rsfObject, viewer, onRsfChange }: ObjectSettingsProps) {
    if (!rsfObject) {
        return (
            <div className="p-4 text-sm text-muted-foreground">
                No RSF object data available
            </div>
        );
    }

    if (!isURDFRobot(object)) {
        return (
            <div className="p-4 text-sm text-muted-foreground">
                This object is not a URDF robot
            </div>
        );
    }

    // Get joints from the Three.js URDF object, filtering out fixed joints
    const urdfJoints = object.joints;
    const jointNames = Object.keys(urdfJoints)
        .filter(name => urdfJoints[name].jointType !== 'fixed')
        .sort();

    if (jointNames.length === 0) {
        return (
            <div className="p-4 text-sm text-muted-foreground">
                No movable joints found in this robot
            </div>
        );
    }

    // Get RSF joint channels (may be undefined if not yet configured)
    const rsfJoints = rsfObject.joints || {};

    const handleJointChannelChange = (jointName: string, updates: Partial<KinematicChannel>) => {
        const newJoints = {
            ...rsfJoints,
            [jointName]: {
                ...(rsfJoints[jointName] || {}),
                ...updates
            }
        };
        onRsfChange?.({ joints: newJoints });
    };

    return (
        <div className="p-3 space-y-2">
            <div className="pb-2">
                <Label className="text-sm font-semibold">Joint Angles</Label>
                <p className="text-xs text-muted-foreground mt-1">
                    Configure joint angles and animation channels
                </p>
            </div>

            {jointNames.map(jointName => (
                <JointEditor
                    key={jointName}
                    jointName={jointName}
                    urdfJoint={urdfJoints[jointName]}
                    viewer={viewer}
                    channel={rsfJoints[jointName]}
                    onChange={(updates) => handleJointChannelChange(jointName, updates)}
                />
            ))}
        </div>
    );
}

export const RobotSettingsProvider: ObjectSettingsProvider = {
    id: 'robot-joints',
    name: 'Joints',
    icon: 'Wrench',
    canHandle: (object: Object3D) => {
        return isURDFRobot(object);
    },
    SettingsComponent: RobotSettingsComponent,
};
