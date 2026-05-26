import React from 'react';
import { usePlans } from './PlanContext';
import type { Plan } from '../../../common/rsf';
import type { SceneObject } from '@gov.nasa.jpl.honeycomb/core';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '../ui/select';
import { Label } from '../ui/label';
import { Input } from '../ui/input';

interface CorePlanSettingsProps {
    scene: SceneObject[];
}

export const CorePlanSettings: React.FC<CorePlanSettingsProps> = ({ scene }) => {
    const { activePlan, updatePlan } = usePlans();

    if (!activePlan) {
        return null;
    }

    // Get robot models from the scene
    const robots = scene
        .filter((obj) => obj.type === 'model')
        .map((obj) => ({
            id: obj.id,
            name: obj.name || 'Unnamed',
        }));

    const handleRobotChange = (robotId: string) => {
        updatePlan(activePlan.uuid, {
            robot: robotId === 'none' ? undefined : robotId,
        });
    };

    const handleNameChange = (name: string) => {
        updatePlan(activePlan.uuid, { name });
    };

    const handleInitialTimeChange = (time: number) => {
        updatePlan(activePlan.uuid, {
            initialState: {
                ...activePlan.initialState,
                time,
            },
        });
    };

    return (
        <div className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="plan-name" className="text-xs font-medium">
                    Plan Name
                </Label>
                <Input
                    id="plan-name"
                    value={activePlan.name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    className="h-8 text-sm"
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="robot-select" className="text-xs font-medium">
                    Robot Model
                </Label>
                <Select
                    value={activePlan.robot || 'none'}
                    onValueChange={handleRobotChange}
                >
                    <SelectTrigger id="robot-select" className="h-8 text-sm">
                        <SelectValue placeholder="No robot selected" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="none">No robot</SelectItem>
                        {robots.length === 0 ? (
                            <SelectItem value="no-robots" disabled>
                                No robot models in scene
                            </SelectItem>
                        ) : (
                            robots.map((robot) => (
                                <SelectItem key={robot.id} value={robot.id}>
                                    {robot.name}
                                </SelectItem>
                            ))
                        )}
                    </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                    Robot model to visualize during plan execution
                </p>
            </div>

            <div className="space-y-2">
                <Label htmlFor="initial-time" className="text-xs font-medium">
                    Initial Time (s)
                </Label>
                <Input
                    id="initial-time"
                    type="number"
                    value={activePlan.initialState.time}
                    onChange={(e) => handleInitialTimeChange(parseFloat(e.target.value) || 0)}
                    className="h-8 text-sm"
                    step="0.1"
                />
                <p className="text-xs text-muted-foreground">
                    Starting time for this plan
                </p>
            </div>
        </div>
    );
};
