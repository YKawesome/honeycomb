# Honeycomb VSCode Extension - Plugin System

This document describes the plan/activity system and how to write plugins for the Honeycomb VSCode extension.

## Overview

The plugin system is inspired by the Grafana panel plugin architecture and simplified from rsvp-lite:
- **Activities**: Time-based actions with 3D visualizations and React settings UI
- **Tools**: Modify viewer interaction (camera controls, selection, etc.)
- **Global Panels**: Persistent UI overlays
- **Dynamic Loading**: Plugins loaded via dynamic imports from URLs or paths

## Architecture

### Data Structures

Activities use a **builder API** pattern (like Grafana annotations):
```typescript
interface Activity<S = any> {
    uuid: string;
    type: string;        // Registered by plugin
    parameters: S;       // Type-specific data
}

interface Plan {
    uuid: string;
    name: string;
    robot?: string;      // Robot model to visualize
    initialState: Frame<RobotState>;
    activities: Activity[];
}
```

### UI Components

Activities provide optional **React components** for settings:
```typescript
interface ActivityProvider<S = any> {
    type: string;
    name: string;
    category: ActivityCategory;
    
    // Builder: Create 3D visualization
    createObject(viewer: Viewer): ActivityObject<S>;
    
    // React: Settings UI (optional)
    SettingsComponent?: FC<ActivitySettingsProps<S>>;
    
    // Builder: Default parameters
    getDefaultParameters(plan: Plan, previousActivity?: Activity): S;
}
```

## Writing a Plugin

### Basic Plugin Structure

Create a JavaScript/TypeScript file that exports a plugin:

```typescript
import type { HoneycombPlugin, PluginContext } from '@gov.nasa.jpl.honeycomb/vscode-common/plugins';

const plugin: HoneycombPlugin = {
    activate(context: PluginContext) {
        // Register activities, tools, panels
        context.registerActivity(myActivityProvider);
        context.registerTool(myTool);
        context.registerPanel(myPanel);
    },
    
    deactivate() {
        // Optional cleanup
    }
};

export default plugin;
```

### Example: Waypoint Activity

```typescript
import { Object3D, SphereGeometry, MeshBasicMaterial, Mesh } from 'three';
import type {
    ActivityProvider,
    ActivityObject,
    ActivityVisualState,
    ActivitySettingsProps
} from '@gov.nasa.jpl.honeycomb/vscode-common/plugins';

// Parameters for this activity
interface WaypointParams {
    x: number;
    y: number;
    z: number;
    label?: string;
}

// 3D visualization object
class WaypointObject extends Object3D implements ActivityObject<WaypointParams> {
    private marker: Mesh;
    
    constructor(viewer: Viewer) {
        super();
        
        // Create a sphere marker
        const geometry = new SphereGeometry(0.5, 16, 16);
        const material = new MeshBasicMaterial({ color: 0x00ff00 });
        this.marker = new Mesh(geometry, material);
        this.add(this.marker);
    }
    
    update(
        initialState: RobotState,
        activity: Activity<WaypointParams>,
        plan: Plan,
        visualState: ActivityVisualState
    ): void {
        // Update position from parameters
        this.position.set(
            activity.parameters.x,
            activity.parameters.y,
            activity.parameters.z
        );
        
        // Change color based on state
        const material = this.marker.material as MeshBasicMaterial;
        switch (visualState) {
            case ActivityVisualState.SELECTED:
                material.color.setHex(0xffff00); // Yellow
                break;
            case ActivityVisualState.ACTIVE:
                material.color.setHex(0x00ff00); // Green
                break;
            case ActivityVisualState.DISABLED:
                material.color.setHex(0x888888); // Gray
                break;
        }
    }
    
    // Optional: Generate keyframes for robot motion
    async generateKeyframes(
        initialFrame: Frame<RobotState>,
        activity: Activity<WaypointParams>,
        plan: Plan,
        activityIndex: number
    ): Promise<Frame<RobotState>[]> {
        // Return keyframes showing robot moving to waypoint
        return [
            { time: initialFrame.time, state: initialFrame.state },
            { 
                time: initialFrame.time + 10, // 10 seconds later
                state: {
                    ...initialFrame.state,
                    position: [
                        activity.parameters.x,
                        activity.parameters.y,
                        activity.parameters.z
                    ]
                }
            }
        ];
    }
}

// React settings component
const WaypointSettings: React.FC<ActivitySettingsProps<WaypointParams>> = ({
    activity,
    onChange
}) => {
    return (
        <div className="space-y-3">
            <div>
                <label className="text-xs font-medium">X Position</label>
                <input
                    type="number"
                    value={activity.parameters.x}
                    onChange={(e) => onChange({
                        ...activity.parameters,
                        x: parseFloat(e.target.value)
                    })}
                    className="w-full mt-1 px-2 py-1 text-sm border rounded"
                />
            </div>
            <div>
                <label className="text-xs font-medium">Y Position</label>
                <input
                    type="number"
                    value={activity.parameters.y}
                    onChange={(e) => onChange({
                        ...activity.parameters,
                        y: parseFloat(e.target.value)
                    })}
                    className="w-full mt-1 px-2 py-1 text-sm border rounded"
                />
            </div>
            <div>
                <label className="text-xs font-medium">Z Position</label>
                <input
                    type="number"
                    value={activity.parameters.z}
                    onChange={(e) => onChange({
                        ...activity.parameters,
                        z: parseFloat(e.target.value)
                    })}
                    className="w-full mt-1 px-2 py-1 text-sm border rounded"
                />
            </div>
            <div>
                <label className="text-xs font-medium">Label</label>
                <input
                    type="text"
                    value={activity.parameters.label || ''}
                    onChange={(e) => onChange({
                        ...activity.parameters,
                        label: e.target.value
                    })}
                    className="w-full mt-1 px-2 py-1 text-sm border rounded"
                />
            </div>
        </div>
    );
};

// Activity provider
const waypointProvider: ActivityProvider<WaypointParams> = {
    type: 'waypoint',
    name: 'Waypoint',
    description: 'Navigate to a specific position',
    category: ActivityCategory.MOTION,
    
    createObject(viewer: Viewer) {
        return new WaypointObject(viewer);
    },
    
    SettingsComponent: WaypointSettings,
    
    getDefaultParameters(plan: Plan, previousActivity?: Activity) {
        // Default to origin, or near previous activity
        if (previousActivity?.parameters?.x !== undefined) {
            return {
                x: previousActivity.parameters.x + 1,
                y: previousActivity.parameters.y,
                z: previousActivity.parameters.z,
            };
        }
        return { x: 0, y: 0, z: 0 };
    }
};

// Plugin
const plugin: HoneycombPlugin = {
    activate(context) {
        context.registerActivity(waypointProvider);
    }
};

export default plugin;
```

### Example: Camera Tool

Tools modify viewer interaction:

```typescript
import type { Tool } from '@gov.nasa.jpl.honeycomb/vscode-common/plugins';

const cameraTool: Tool = {
    id: 'free-camera',
    name: 'Free Camera',
    icon: 'video', // lucide-react icon name
    
    activate(viewer: Viewer) {
        // Enable free camera controls
        viewer.controls.enabled = true;
        viewer.controls.enableKeys = true;
        console.log('Free camera activated');
    },
    
    deactivate(viewer: Viewer) {
        // Restore default controls
        viewer.controls.enableKeys = false;
        console.log('Free camera deactivated');
    }
};
```

### Example: Global Panel

Persistent UI overlay:

```typescript
import type { GlobalPanel } from '@gov.nasa.jpl.honeycomb/vscode-common/plugins';

const StatusPanel: React.FC = () => {
    return (
        <div className="bg-background/90 backdrop-blur-sm p-2 rounded shadow-lg">
            <div className="text-xs font-semibold mb-1">Status</div>
            <div className="text-xs text-muted-foreground">
                System nominal
            </div>
        </div>
    );
};

const statusPanel: GlobalPanel = {
    id: 'status-panel',
    Component: StatusPanel,
    placement: 'top-right'
};
```

## Loading Plugins

### In RSF File

Add plugins to your RSF:

```json
{
    "version": "2.0",
    "plugins": [
        "package://my-plugin.js",
        "https://example.com/plugin.js"
    ],
    "plans": [...],
    "scene": [...]
}
```

### Protocol URI Resolution

The `package://` protocol resolves via VSCode settings:

```json
{
    "honeycomb.rootPaths": [
        {
            "name": "package",
            "path": "/path/to/plugins"
        }
    ]
}
```

### Dynamic Loading

Plugins are loaded via dynamic import when RSF opens:
1. Plugins listed in `rsf.plugins` are loaded in order
2. Each plugin's `activate()` is called with a `PluginContext`
3. Providers are registered and available in UI immediately

## API Reference

### ActivityProvider<S, T>

- `type: string` - Unique activity identifier
- `name: string` - Display name
- `description?: string` - Description
- `category: ActivityCategory` - UI organization hint
- `createObject(viewer)` - Create 3D visualization object
- `SettingsComponent?: FC<ActivitySettingsProps<S>>` - Optional React settings UI
- `getDefaultParameters(plan, previousActivity?)` - Generate default parameters

### ActivityObject<S, T>

- `update(initialState, activity, plan, visualState)` - Update 3D visualization
- `generateKeyframes?(initialFrame, activity, plan, index)` - Optional keyframe generation
- `dispose?()` - Optional cleanup

### Tool

- `id: string` - Unique tool identifier
- `name: string` - Display name
- `icon?: string` - lucide-react icon name
- `activate(viewer)` - Enable tool
- `deactivate(viewer)` - Disable tool

### GlobalPanel

- `id: string` - Unique panel identifier
- `Component: FC` - React component to render
- `placement?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'`

## Best Practices

1. **Use TypeScript** for type safety
2. **Keep activities simple** - visualize, don't simulate
3. **Dispose resources** - clean up geometries, materials, listeners
4. **Use React hooks** in settings components
5. **Follow Tailwind/Radix** styling in UI components
6. **Test with minimal RSF** before adding complexity

## Comparison to rsvp-lite

| Feature | rsvp-lite | VSCode Extension |
|---------|-----------|------------------|
| Plugin loading | Node.js `require` | Dynamic `import()` |
| Activity visualization | Three.js objects | Three.js objects |
| Settings UI | JSON Schema + RJSF | React components |
| Tools | Not built-in | First-class support |
| Global panels | Not built-in | First-class support |
| Plan editing | Full planning UI | Full planning UI |

## Next Steps

1. Write your first plugin (see examples above)
2. Add it to an RSF file
3. Test in VSCode extension
4. Share plugins as npm packages or URLs

For more examples, see:
- `app/vscode/examples/plugins/` (coming soon)
- Grafana plugin examples in `app/grafana/src/honeycomb/annotations/`
