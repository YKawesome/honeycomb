# RSF Migration Guide: 1.0 to 2.0

This guide explains how to migrate your RSF files from version 1.0 to version 2.0.

## Overview

RSF 2.0 introduces several major improvements:

- **Version tagging**: Automatic format detection
- **Kinematic channels**: Support for time-varying (animated) properties
- **Structured scene graph**: Direct parent references instead of frame paths
- **State history**: Embedded telemetry data for offline playback (VSCode)
- **Consistent format**: All position/orientation data uses the same channel structure

## Quick Start

### Automatic Migration (Recommended)

The easiest way to migrate is using the provided migration utilities in the VSCode extension:

```typescript
import { migrateToRSF2 } from '../common/migration';
import * as fs from 'fs';

// Read your RSF 1.0 file
const rsf1Content = fs.readFileSync('my-scene.rsf', 'utf-8');
const rsf1 = JSON.parse(rsf1Content);

// Automatically migrate to 2.0
const rsf2 = migrateToRSF2(rsf1);

// Save the migrated file
fs.writeFileSync('my-scene.rsf', JSON.stringify(rsf2, null, 2));
```

### Manual Migration

If you prefer to migrate manually or need fine-grained control:

#### 1. Add Version Tag

```diff
  {
+   "version": "2.0",
    "options": { ... },
    "scene": [ ... ]
  }
```

#### 2. Convert Position Arrays to Channels

**RSF 1.0:**
```json
"position": [1, 2, 3]
```

**RSF 2.0:**
```json
"position": {
  "x": { "type": "constant", "interpolate": false, "value": 1 },
  "y": { "type": "constant", "interpolate": false, "value": 2 },
  "z": { "type": "constant", "interpolate": false, "value": 3 }
}
```

#### 3. Convert Orientation Arrays to Channels

**RSF 1.0:**
```json
"orientation": [0, 0, 0, 1]
```

**RSF 2.0:**
```json
"orientation": {
  "type": "jpl",
  "x": { "type": "constant", "interpolate": false, "value": 0 },
  "y": { "type": "constant", "interpolate": false, "value": 0 },
  "z": { "type": "constant", "interpolate": false, "value": 0 },
  "w": { "type": "constant", "interpolate": false, "value": 1 }
}
```

#### 4. Convert Pose to Position/Orientation

**RSF 1.0:**
```json
{
  "pose": {
    "position": [1, 2, 3],
    "orientation": [0, 0, 0, 1]
  }
}
```

**RSF 2.0:**
```json
{
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
  }
}
```

#### 5. Convert Frame Paths to Parent References

**RSF 1.0:**
```json
{
  "id": "child-obj",
  "name": "Child",
  "frame": ["world", "parent"]
}
```

**RSF 2.0:**
```json
{
  "id": "child-obj",
  "name": "Child",
  "parent": "parent-id"
}
```

Note: The parent field uses the **ID** of the parent object, not its name.

#### 6. Add Missing Default Options

RSF 2.0 requires additional option fields:

```json
{
  "options": {
    "playbackSpeed": 1,
    "gridVisibility": true,
    "up": "+Z",
    "viewCube": true,
    "lightDirection": [1, 1, -1],
    "lightIntensity": 1,
    "ambientLightIntensity": 0.5
  }
}
```

## Migration API Reference

### `detectRSFVersion(rsf: any): "1.0" | "2.0" | "unknown"`

Automatically detects the RSF format version.

```typescript
import { detectRSFVersion } from '../common/migration';

const version = detectRSFVersion(myRsfData);
console.log(`Detected version: ${version}`);
```

### `migrateRSF1toRSF2(rsf1: RSF1): RSF`

Explicitly migrates RSF 1.0 to 2.0.

```typescript
import { migrateRSF1toRSF2 } from '../common/migration';

const rsf2 = migrateRSF1toRSF2(rsf1Data);
```

### `migrateToRSF2(rsf: any): RSF`

Automatically detects version and migrates if needed. **Recommended for most use cases.**

```typescript
import { migrateToRSF2 } from '../common/migration';

const rsf2 = migrateToRSF2(rsfData); // Works with 1.0 or 2.0
```

### `validateRSF2(rsf: any): boolean`

Validates that an object is a valid RSF 2.0 format.

```typescript
import { validateRSF2 } from '../common/migration';

if (validateRSF2(rsf2)) {
  console.log('Valid RSF 2.0 format');
} else {
  console.error('Invalid RSF 2.0 format');
}
```

## Complete Migration Example

Here's a complete before-and-after example:

### Before (RSF 1.0)

```json
{
  "options": {
    "playbackSpeed": 1,
    "gridVisibility": true,
    "up": "+Z"
  },
  "scene": [
    {
      "id": "world",
      "type": "frame",
      "name": "World",
      "position": [0, 0, 0],
      "orientation": [0, 0, 0, 1]
    },
    {
      "id": "robot",
      "type": "model",
      "name": "Mars Rover",
      "frame": ["world"],
      "pose": {
        "position": [10, 20, 0.5],
        "orientation": [0, 0, 0.707, 0.707]
      },
      "model": {
        "type": "urdf",
        "path": "./models/rover.urdf"
      }
    }
  ]
}
```

### After (RSF 2.0)

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
      "id": "world",
      "type": "frame",
      "name": "World",
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
      "name": "Mars Rover",
      "parent": "world",
      "position": {
        "x": { "type": "constant", "interpolate": false, "value": 10 },
        "y": { "type": "constant", "interpolate": false, "value": 20 },
        "z": { "type": "constant", "interpolate": false, "value": 0.5 }
      },
      "orientation": {
        "type": "jpl",
        "x": { "type": "constant", "interpolate": false, "value": 0 },
        "y": { "type": "constant", "interpolate": false, "value": 0 },
        "z": { "type": "constant", "interpolate": false, "value": 0.707 },
        "w": { "type": "constant", "interpolate": false, "value": 0.707 }
      },
      "model": {
        "type": "urdf",
        "path": "./models/rover.urdf"
      }
    }
  ]
}
```

## Adding Animation (Optional)

One of the major benefits of RSF 2.0 is support for animated channels. Here's how to upgrade a static object to use animated position:

```json
{
  "id": "robot",
  "type": "model",
  "name": "Mars Rover",
  "parent": "world",
  "position": {
    "x": {
      "type": "animated",
      "interpolate": true,
      "value": 0,
      "field": "rover_x"
    },
    "y": {
      "type": "animated",
      "interpolate": true,
      "value": 0,
      "field": "rover_y"
    },
    "z": {
      "type": "constant",
      "interpolate": false,
      "value": 0.5
    }
  },
  "orientation": { ... },
  "model": {
    "type": "urdf",
    "path": "./models/rover.urdf"
  }
}
```

The `field` property references columns in your telemetry data (Grafana queries) or state history (VSCode).

## Adding State History (VSCode)

For VSCode offline playback, you can embed telemetry data:

```json
{
  "version": "2.0",
  "stateHistory": [
    {
      "timestamp": 1234567890000,
      "fields": {
        "rover_x": 10.0,
        "rover_y": 20.0
      }
    },
    {
      "timestamp": 1234567890100,
      "fields": {
        "rover_x": 10.5,
        "rover_y": 20.2
      }
    }
  ],
  "options": { ... },
  "scene": [ ... ]
}
```

## Common Issues

### Issue: "Unknown RSF format version"

**Cause**: The file doesn't match RSF 1.0 or 2.0 patterns.

**Solution**: Ensure your RSF 1.0 file has either array-based `position`/`orientation` or a `pose` field.

### Issue: Parent reference not found

**Cause**: Frame name doesn't match any object ID in the scene.

**Solution**: Ensure all objects have IDs, and parent references use IDs not names.

### Issue: Missing required options

**Cause**: RSF 2.0 requires more option fields than 1.0.

**Solution**: Use `migrateToRSF2()` which fills in defaults automatically.

## Need Help?

- See [RSF-2.0-SPECIFICATION.md](./RSF-2.0-SPECIFICATION.md) for complete format documentation
- Check the [example.rsf](./app/vscode/example.rsf) file for a working example
- Review migration code in [app/vscode/common/migration.ts](./app/vscode/common/migration.ts)
- RSF 2.0 types in [app/vscode/common/rsf.ts](./app/vscode/common/rsf.ts)

## Backwards Compatibility

RSF 2.0 viewers can automatically migrate and load RSF 1.0 files using the `migrateToRSF2()` function. However, RSF 1.0 viewers cannot read RSF 2.0 files. If you need to support both:

1. Keep original RSF 1.0 files in version control
2. Generate RSF 2.0 files at build/deploy time
3. Use version detection to load the appropriate format

```typescript
const version = detectRSFVersion(rsfData);
if (version === "1.0") {
  // Use legacy loader
} else if (version === "2.0") {
  // Use new loader
}
```
