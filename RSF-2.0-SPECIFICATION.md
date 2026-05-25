# RSF 2.0 Specification

## Overview

RSF (Robot Scene Format) 2.0 is a JSON-based file format for describing 3D scenes with robotics and telemetry visualization capabilities used by the **VSCode extension**. It defines scene objects, their transformations, kinematic channels, and visualization options.

**Note**: Grafana does not use the full RSF file format. It only uses the `Scene` and `SceneOptions` interfaces directly from the core package, sourcing data through queries rather than embedded state history.

## Top-Level Structure

An RSF 2.0 file consists of the following sections:

```json
{
  "version": "2.0",
  "options": { ... },
  "scene": [ ... ],
  "stateHistory": [ ... ]
}
```

### `version` (string)

The RSF format version. Must be `"2.0"` for this specification. Used to detect and migrate legacy formats.

**Required**: Yes

### `options` (SceneOptions)

Global settings for the scene viewer and rendering environment.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `playbackSpeed` | number | Yes | Playback speed multiplier for animation (1.0 = real-time) |
| `gridVisibility` | boolean | Yes | Whether to show the ground grid |
| `up` | string | Yes | Up axis orientation. Valid values: `"+X"`, `"-X"`, `"+Y"`, `"-Y"`, `"+Z"`, `"-Z"` |
| `viewCube` | boolean | Yes | Whether to show the view cube widget |
| `lightDirection` | [number, number, number] | Yes | Direction vector for directional light [x, y, z] |
| `lightIntensity` | number | Yes | Intensity of directional light (0.0 to 1.0+) |
| `ambientLightIntensity` | number | Yes | Intensity of ambient light (0.0 to 1.0+) |
| `sunAzimuth` | number | No | Sun azimuth angle in degrees |
| `sunElevation` | number | No | Sun elevation angle in degrees |
| `camera` | object | No | Camera configuration options (see Camera Options) |

#### Camera Options

| Field | Type | Description |
|-------|------|-------------|
| `near` | number | Near clipping plane distance |
| `far` | number | Far clipping plane distance |
| `targetFocusOffset` | any | Focus offset in robot frame |

### `scene` (Scene)

An array of scene objects. Each object represents a model, frame, or annotation in the 3D scene.

**Required**: Yes

### `stateHistory` (StateHistory)

Optional embedded telemetry data for VSCode and offline playback. Not needed for Grafana which sources data from queries.

An array of timestamped state snapshots containing values for all animated channels.

**Required**: No (used by VSCode, not needed for Grafana)

See [State History](#state-history) section for details.

## Scene Object Types

All scene objects share a common base structure with type-specific extensions.

### Common Base Fields (SceneObjectBase)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Unique identifier for the object |
| `type` | string | Yes | Object type: `"model"`, `"frame"`, or `"annotation"` |
| `name` | string | Yes | Display name in the scene graph |
| `description` | string | No | Description shown in UI widgets |
| `parent` | string \| null | No | ID of parent object, or null for root |
| `position` | Position | Yes | Position channels (see Position) |
| `orientation` | Orientation | Yes | Orientation channels (see Orientation) |
| `joints` | Joints | No | Custom kinematic joint channels (see Joints) |
| `label` | object | No | Optional text label overlay (see Label) |
| `tags` | string[] | No | Tags for filtering/categorization |

#### Label

| Field | Type | Description |
|-------|------|-------------|
| `text` | string | Label text to display |
| `x` | number | X offset from object origin |
| `y` | number | Y offset from object origin |
| `z` | number | Z offset from object origin |

### Model Object (`type: "model"`)

Loads an external 3D model file.

**Additional Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `model` | ModelObjectData | Yes | Model configuration (see ModelObjectData) |

#### ModelObjectData

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `path` | string | Yes | Path to model file (absolute or relative to RSF) |
| `type` | string | No | Model type hint: `"urdf"`, `"fbx"`, `"ht"`, etc. If omitted, inferred from file extension |
| `rawPath` | string | No | Internal use: stores original path before webview URI conversion |
| `options` | object | No | Loader-specific options (see Model Options) |

#### Model Options

Common loader-specific options (availability depends on model type):

| Field | Type | Description |
|-------|------|-------------|
| `receiveShadow` | boolean | Whether object receives shadows |
| `useCustomDepthShaderMaterial` | boolean | Use custom depth shader |
| `useOptimizedRaycast` | boolean | Use BVH-optimized raycasting (default: true) |
| `renderOrder` | number | Rendering order for transparency sorting |
| `isTerrain` | boolean | Mark as terrain (may be deprecated) |
| `optimizeGeometry` | boolean | Apply geometry optimization |
| `zScale` | number | Z-axis scaling factor |
| `zOffset` | number | Z-axis offset |
| `orthophotoPath` | string | Path to orthophoto texture |

### Frame Object (`type: "frame"`)

An abstract coordinate frame with no visual representation. Useful for defining reference frames and organizing the scene hierarchy.

**No additional fields beyond SceneObjectBase.**

### Annotation Object (`type: "annotation"`)

A custom visualization or widget registered at runtime.

**Additional Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `annotation` | AnnotationOptions | Yes | Annotation configuration (see AnnotationOptions) |

#### AnnotationOptions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | string | No | Registered annotation type identifier |
| `parent` | string \| null | No | Parent frame for placement |
| `staleBehavior` | string | Yes | Behavior when data is stale: `"invisible"` or `"defaults"` |
| `staleThreshold` | number \| boolean | Yes | Max age in ms before data is stale, or `false` to never mark stale |
| `channels` | Record<string, Channel> | No | Channelized data model (see Channels) |
| `tables` | Record<string, Table> | No | Structured data model (see Tables) |
| `options` | any | Yes | Type-specific options passed to the annotation |

#### Table

| Field | Type | Description |
|-------|------|-------------|
| `refId` | string \| null | Reference ID for table lookup |
| `table` | string \| null | Table name (uses first table if omitted) |
| `ignoreFirstSegment` | boolean | Whether to ignore first segment in queries |

## Kinematic Channels

Kinematic channels define how object properties change over time or remain constant.

### Channel

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | string | Yes | Channel type: `"constant"` or `"animated"` |
| `interpolate` | boolean | Yes | Whether to interpolate between values (numeric channels only) |
| `value` | any | Yes | Constant value or default when no data available |
| `field` | string | No | Column name in data query (animated channels only) |
| `useSeparateTimeChannel` | boolean | No | Use separate channel for time values |
| `timeChannel` | Channel | No | Separate time channel definition |

### Position

Position channels for X, Y, Z coordinates. Each axis is a KinematicChannel (Channel with number value).

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `x` | Channel\<number> | Yes | X-axis kinematic channel |
| `y` | Channel\<number> | Yes | Y-axis kinematic channel |
| `z` | Channel\<number> | Yes | Z-axis kinematic channel |

### Orientation

Orientation channels supporting multiple conventions.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | string | Yes | Convention: `"rpy"` (roll-pitch-yaw), `"hamilton"` (WXYZ), or `"jpl"` (XYZW) |
| `x` | Channel\<number> | Yes | Roll or X component |
| `y` | Channel\<number> | Yes | Pitch or Y component |
| `z` | Channel\<number> | Yes | Yaw or Z component |
| `w` | Channel\<number> | Yes | W component (unused for RPY) |

### Joints

A dictionary mapping joint names to kinematic channels for articulated models (e.g., URDF robots).

```typescript
Record<string, Channel<number>>
```

### Pose

A static pose definition (used in placement operations).

| Field | Type | Description |
|-------|------|-------------|
| `position` | [number, number, number] | Position as [x, y, z] |
| `orientation` | [number, number, number, number] | Orientation as [x, y, z, w] quaternion |

## Example: Simplified RSF File

```json
{
  "options": {
    "playbackSpeed": 1,
    "gridVisibility": true,
    "up": "+Z",
    "viewCube": true,
    "lightDirection": [1, 1, -1],
    "lightIntensity": 1,
    "ambientLightIntensity": 0.5,
    "camera": {
      "near": 0.01,
      "far": 10000
    }
  },
  "scene": [
    {
      "id": "world",
      "type": "frame",
      "name": "World Frame",
      "parent": null,
      "position": {
        "x": { "type": "constant", "interpolate": false, "value": 0 },
        "y": { "type": "constant", "interpolate": false, "value": 0 },
        "z": { "type": "constant", "interpolate": false, "value": 0 }
      },
      "orientation": {
        "type": "jpl",
        "x": { "type": "constant", "interpolate": false, "value": 0 },
        "y": { "type": "constant", "interpolate": false, "value": 0 },
        "z": { "type": "constant", "interpolate": false, "value": 0 },
        "w": { "type": "constant", "interpolate": false, "value": 1 }
      }
    },
    {
      "id": "robot",
      "type": "model",
      "name": "Robot",
      "parent": "world",
      "position": {
        "x": { "type": "animated", "interpolate": true, "value": 0, "field": "pos_x" },
        "y": { "type": "animated", "interpolate": true, "value": 0, "field": "pos_y" },
        "z": { "type": "animated", "interpolate": true, "value": 0, "field": "pos_z" }
      },
      "orientation": {
        "type": "jpl",
        "x": { "type": "animated", "interpolate": true, "value": 0, "field": "quat_x" },
        "y": { "type": "animated", "interpolate": true, "value": 0, "field": "quat_y" },
        "z": { "type": "animated", "interpolate": true, "value": 0, "field": "quat_z" },
        "w": { "type": "animated", "interpolate": true, "value": 1, "field": "quat_w" }
      },
      "model": {
        "type": "urdf",
        "path": "./models/robot.urdf",
        "options": {
          "receiveShadow": true,
          "useOptimizedRaycast": true
        }
      },
      "joints": {
        "arm_joint": { "type": "animated", "interpolate": true, "value": 0, "field": "arm_angle" }
      }
    },
    {
      "id": "path-viz",
      "type": "annotation",
      "name": "Path Visualization",
      "parent": "world",
      "position": {
        "x": { "type": "constant", "interpolate": false, "value": 0 },
        "y": { "type": "constant", "interpolate": false, "value": 0 },
        "z": { "type": "constant", "interpolate": false, "value": 0 }
      },
      "orientation": {
        "type": "jpl",
        "x": { "type": "constant", "interpolate": false, "value": 0 },
        "y": { "type": "constant", "interpolate": false, "value": 0 },
        "z": { "type": "constant", "interpolate": false, "value": 0 },
        "w": { "type": "constant", "interpolate": false, "value": 1 }
      },
      "annotation": {
        "type": "path",
        "staleBehavior": "invisible",
        "staleThreshold": 5000,
        "channels": {
          "waypoints": {
            "type": "animated",
            "interpolate": false,
            "value": [],
            "field": "path_points"
          }
        },
        "options": {
          "color": "#ff0000",
          "lineWidth": 2
        }
      }
    }
  ]
}
```

## Channel Types: Constant vs Animated

### Constant Channels

Used for static values that don't change over time:

```json
{
  "type": "constant",
  "interpolate": false,
  "value": 0
}
```

### Animated Channels

Used for time-varying data linked to telemetry fields:

```json
{
  "type": "animated",
  "interpolate": true,
  "value": 0,
  "field": "telemetry_column_name"
}
```

The `field` references a column in the telemetry data source. The `value` is used as a default when no data is available.

## Orientation Conventions

Three orientation conventions are supported:

1. **RPY (Roll-Pitch-Yaw)**: Euler angles in radians
   - `x`: roll, `y`: pitch, `z`: yaw, `w`: unused
   
2. **Hamilton (WXYZ)**: Quaternion with W first
   - `w`, `x`, `y`, `z` components
   
3. **JPL (XYZW)**: Quaternion with W last
   - `x`, `y`, `z`, `w` components

## Annotation Stale Behavior

Annotations can specify how to handle stale data:

- **`invisible`**: Hide the annotation when data is stale
- **`defaults`**: Show the annotation using default values when data is stale

The `staleThreshold` field determines when data is considered stale:
- `number`: Maximum age in milliseconds
- `false`: Never mark as stale

## Model Path Resolution

Model paths can be:
- **Absolute paths**: `/absolute/path/to/model.obj`
- **Relative paths**: `./models/robot.urdf` (relative to RSF file location)
- **URI schemes**: `cadre://path/to/model` (custom URI schemes)

The file extension determines the loader unless `type` is explicitly specified.

## Supported Model Types

Common model types include:
- `urdf`: Universal Robot Description Format
- `fbx`: Autodesk FBX
- `ht`: Custom format
- `obj`: Wavefront OBJ
- `gltf`/`glb`: GL Transmission Format
- Others as registered with the loader system

## State History

State history provides embedded telemetry data for offline playback in VSCode. Grafana does not use this as it queries data directly.

### StateSnapshot

Each snapshot contains a timestamp and field values.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `timestamp` | number | Yes | Unix timestamp in milliseconds |
| `fields` | Record<string, any> | Yes | Map of field names to values |

### Example State History

```json
{
  "version": "2.0",
  "stateHistory": [
    {
      "timestamp": 1234567890000,
      "fields": {
        "pos_x": 1.5,
        "pos_y": 2.3,
        "pos_z": 0.5,
        "quat_x": 0,
        "quat_y": 0,
        "quat_z": 0,
        "quat_w": 1,
        "arm_angle": 0.5
      }
    },
    {
      "timestamp": 1234567890100,
      "fields": {
        "pos_x": 1.52,
        "pos_y": 2.31,
        "pos_z": 0.51,
        "quat_x": 0,
        "quat_y": 0,
        "quat_z": 0.01,
        "quat_w": 0.9999,
        "arm_angle": 0.52
      }
    }
  ],
  "options": { ... },
  "scene": [ ... ]
}
```

The `field` names in channels reference keys in the `fields` object of each snapshot.

---

## Migration from RSF 1.0 to RSF 2.0

RSF 1.0 used a simpler format without kinematic channels. The migration process automatically converts static array values to constant channels.

### Key Differences

| Feature | RSF 1.0 | RSF 2.0 |
|---------|---------|---------|
| Version tag | None | `"version": "2.0"` |
| Position | Array `[x, y, z]` | Channels `{x, y, z}` |
| Orientation | Array `[x, y, z, w]` | Channels with convention |
| Placement | `pose: {position, orientation}` | Channels in base object |
| Parent reference | `frame: ["path", "to", "parent"]` | `parent: "parent-id"` |
| State data | Not supported | Optional `stateHistory` |

### RSF 1.0 Example

```json
{
  "options": {
    "playbackSpeed": 1,
    "gridVisibility": true,
    "up": "+Z"
  },
  "scene": [
    {
      "id": "robot",
      "type": "model",
      "name": "Robot",
      "pose": {
        "position": [1, 2, 3],
        "orientation": [0, 0, 0, 1]
      },
      "frame": ["world"],
      "model": {
        "path": "./robot.urdf"
      }
    }
  ]
}
```

### Migrated RSF 2.0

```json
{
  "version": "2.0",
  "options": {
    "playbackSpeed": 1,
    "gridVisibility": true,
    "up": "+Z",
    "viewCube": true,
    "lightDirection": [1, 1, -1],
    "lightIntensity": 1,
    "ambientLightIntensity": 0.5
  },
  "scene": [
    {
      "id": "robot",
      "type": "model",
      "name": "Robot",
      "parent": "world",
      "position": {
        "x": { "type": "constant", "interpolate": false, "value": 1 },
        "y": { "type": "constant", "interpolate": false, "value": 2 },
        "z": { "type": "constant", "interpolate": false, "value": 3 }
      },
      "orientation": {
        "type": "jpl",
        "x": { "type": "constant", "interpolate": false, "value": 0 },
        "y": { "type": "constant", "interpolate": false, "value": 0 },
        "z": { "type": "constant", "interpolate": false, "value": 0 },
        "w": { "type": "constant", "interpolate": false, "value": 1 }
      },
      "model": {
        "path": "./robot.urdf"
      }
    }
  ]
}
```

### Using the Migration API

TypeScript/JavaScript (VSCode extension):

```typescript
import { migrateToRSF2, detectRSFVersion, validateRSF2 } from '../common/migration';

// Load RSF file
const rsfContent = JSON.parse(fileContent);

// Detect version
const version = detectRSFVersion(rsfContent);
console.log(`Detected RSF version: ${version}`);

// Automatically migrate to 2.0 if needed
const rsf2 = migrateToRSF2(rsfContent);

// Validate the result
if (validateRSF2(rsf2)) {
  console.log('Successfully migrated to RSF 2.0');
} else {
  console.error('Migration failed validation');
}

// Use the migrated format
const { version, options, scene, stateHistory } = rsf2;
```

### Migration Behavior

1. **Version Detection**: Automatically detects RSF 1.0 by checking for array-based positions or `pose` fields
2. **Constant Channels**: All static array values become constant channels
3. **Parent Resolution**: Frame paths are resolved to direct parent references using name-to-ID mapping
4. **Default Values**: Missing options are filled with sensible defaults
5. **ID Generation**: Objects without IDs get auto-generated unique identifiers
6. **Validation**: Output is validated to ensure all required fields exist

---

## Version History

**RSF 2.0**: Complete rewrite with kinematic channels, annotation system, structured scene graph, version tagging, and optional embedded state history.

**RSF 1.0**: Original format used in VSCode extension (legacy). Used simple array-based positions/orientations and pose-based placement.
