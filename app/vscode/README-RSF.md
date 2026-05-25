# Using RSF Files with Honeycomb VSCode Extension

## Quick Start

The `example.rsf` file shows the basic structure of an RSF 2.0 file with coordinate frames. To see 3D models in the viewer, you need to add model objects with valid file paths.

## Adding 3D Models

### 1. Prepare Your Model Files

Supported formats:
- `.urdf` - Universal Robot Description Format (with meshes)
- `.obj` - Wavefront OBJ
- `.fbx` - Autodesk FBX
- `.gltf` / `.glb` - GL Transmission Format
- `.stl` - Stereolithography
- `.dae` - COLLADA

### 2. Update the RSF File

Add a model object to the `scene` array:

```json
{
  "id": "my-robot",
  "type": "model",
  "name": "My Robot",
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
  "model": {
    "path": "./models/robot.urdf"
  }
}
```

### 3. Model Path Options

#### Relative Paths
Relative to the `.rsf` file location:
```json
"path": "./models/robot.obj"
"path": "../shared/models/rover.urdf"
```

#### Absolute Paths
Full system paths:
```json
"path": "/Users/username/models/robot.obj"
"path": "C:\\Users\\username\\models\\robot.obj"
```

#### Protocol URIs
Configure custom protocols in VSCode settings:

**VSCode Settings** (`.vscode/settings.json`):
```json
{
  "honeycomb.rootPaths": [
    {
      "name": "package",
      "path": "/path/to/ros/packages"
    },
    {
      "name": "models",
      "path": "${workspaceFolder}/models"
    }
  ]
}
```

**RSF File**:
```json
"path": "package://my_robot_description/meshes/robot.dae"
"path": "models://rover.obj"
```

## Troubleshooting

### Nothing Renders in the Viewer

**Check 1: Valid Model Path**
- Ensure the path in the RSF file points to an existing file
- Check file permissions
- Try an absolute path first to verify the file loads

**Check 2: Browser Console**
Press **Cmd+Shift+P** (Mac) or **Ctrl+Shift+P** (Windows/Linux), then:
- Type "Developer: Open Webview Developer Tools"
- Check Console tab for loading errors
- Look for `[FileLoader]` messages

**Check 3: Model Format**
- Verify the file format is supported
- Check that URDF files have all referenced mesh files
- Ensure texture files are in the correct location

**Check 4: Camera Position**
- The model might be too small or large
- Try adding a `label` to see if the frame is in the right place:
  ```json
  "label": {
    "text": "Robot Here",
    "x": 0,
    "y": 0,
    "z": 0
  }
  ```

### Model Loads But Looks Wrong

**Scale Issues:**
Some models might be at the wrong scale. You can adjust with model options:
```json
"model": {
  "path": "./model.obj",
  "options": {
    "scale": 0.01
  }
}
```

**Orientation Issues:**
Rotate the object in the RSF file by changing the orientation quaternion.

### Protocol URIs Not Resolving

1. Check VSCode settings has the protocol defined
2. Restart VSCode after changing settings
3. Use absolute path temporarily to verify model loads
4. Check VSCode Output panel for honeycomb extension logs

## Example: Complete Robot Scene

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
        "x": { "type": "constant", "value": 0 },
        "y": { "type": "constant", "value": 0 },
        "z": { "type": "constant", "value": 0 }
      },
      "orientation": {
        "type": "jpl",
        "x": { "type": "constant", "value": 0 },
        "y": { "type": "constant", "value": 0 },
        "z": { "type": "constant", "value": 0 },
        "w": { "type": "constant", "value": 1 }
      }
    },
    {
      "id": "robot",
      "type": "model",
      "name": "Mars Rover",
      "parent": "world",
      "position": {
        "x": { "type": "constant", "value": 0 },
        "y": { "type": "constant", "value": 0 },
        "z": { "type": "constant", "value": 0 }
      },
      "orientation": {
        "type": "jpl",
        "x": { "type": "constant", "value": 0 },
        "y": { "type": "constant", "value": 0 },
        "z": { "type": "constant", "value": 0 },
        "w": { "type": "constant", "value": 1 }
      },
      "model": {
        "type": "urdf",
        "path": "./models/rover.urdf"
      },
      "label": {
        "text": "Rover",
        "x": 0,
        "y": 0,
        "z": 1
      }
    },
    {
      "id": "terrain",
      "type": "model",
      "name": "Terrain",
      "parent": "world",
      "position": {
        "x": { "type": "constant", "value": 0 },
        "y": { "type": "constant", "value": 0 },
        "z": { "type": "constant", "value": -0.1 }
      },
      "orientation": {
        "type": "jpl",
        "x": { "type": "constant", "value": 0 },
        "y": { "type": "constant", "value": 0 },
        "z": { "type": "constant", "value": 0 },
        "w": { "type": "constant", "value": 1 }
      },
      "model": {
        "path": "./models/terrain.obj",
        "options": {
          "receiveShadow": true
        }
      }
    }
  ]
}
```

## Animation & State History

For animated properties (coming from telemetry), change `"type": "constant"` to `"type": "animated"` and specify the field name:

```json
"position": {
  "x": {
    "type": "animated",
    "interpolate": true,
    "value": 0,
    "field": "rover_position_x"
  },
  ...
}
```

Then add state history:
```json
{
  "version": "2.0",
  "stateHistory": [
    {
      "timestamp": 1234567890000,
      "fields": {
        "rover_position_x": 1.5,
        "rover_position_y": 2.3,
        ...
      }
    },
    ...
  ],
  "options": { ... },
  "scene": [ ... ]
}
```

## See Also

- [RSF 2.0 Specification](../../RSF-2.0-SPECIFICATION.md) - Complete format documentation
- [Migration Guide](../../MIGRATION-GUIDE.md) - Upgrading from RSF 1.0
- [Honeycomb Documentation](https://github.com/nasa-jpl/honeycomb) - Full project docs
