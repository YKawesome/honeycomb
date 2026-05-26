# Honeycomb Plugin Examples

This directory contains example plugins demonstrating the Honeycomb VSCode extension plugin system.

## Example Plugin

[example-plugin.ts](./example-plugin.ts) demonstrates:

1. **Activity Provider** - Waypoint activity with:
   - 3D sphere marker visualization
   - Path line from initial position
   - React settings component for X/Y/Z position
   - State-based coloring (selected/active/disabled)
   - Keyframe generation with configurable speed

2. **Plan Settings** - Global waypoint configuration:
   - Max speed setting
   - Show/hide paths toggle
   - Accessed by activities via `plan.globals.waypointSettings`

3. **Tool** - Free camera control:
   - Enables keyboard camera movement
   - Demonstrates tool activation/deactivation

4. **Global Panel** - Status display overlay:
   - Shows plugin is loaded
   - Positioned in top-right corner

## Using the Example Plugin

### Option 1: Build and Bundle (Recommended)

Compile the plugin to JavaScript:

```bash
cd /Users/tumbar/git/honeycomb/app/vscode
npx tsc examples/example-plugin.ts --module esnext --target es2020 --jsx react --outDir examples/dist --skipLibCheck
```

This creates `examples/dist/example-plugin.js`.

### Option 2: Direct TypeScript Import (if configured)

If your build system supports importing TypeScript directly, you can reference the `.ts` file.

### Add to RSF

Create or modify an RSF file:

```json
{
    "version": "2.0",
    "plugins": [
        "file:///Users/tumbar/git/honeycomb/app/vscode/examples/dist/example-plugin.js"
    ],
    "plans": [
        {
            "uuid": "plan-1",
            "name": "Example Plan",
            "initialState": {
                "time": 0,
                "state": {
                    "position": [0, 0, 0]
                }
            },
            "globals": {
                "waypointSettings": {
                    "maxSpeed": 1.5,
                    "showPaths": true
                }
            },
            "activities": [
                {
                    "uuid": "activity-1",
                    "type": "waypoint",
                    "parameters": {
                        "x": 1,
                        "y": 2,
                        "z": 0,
                        "label": "First waypoint"
                    }
                },
                {
                    "uuid": "activity-2",
                    "type": "waypoint",
                    "parameters": {
                        "x": 3,
                        "y": 2,
                        "z": 0,
                        "label": "Second waypoint"
                    }
                }
            ]
        }
    ],
    "options": {
        "playbackSpeed": 1,
        "gridVisibility": true,
        "up": "+Z",
        "viewCube": true,
        "lightDirection": [1, 1, -1],
        "lightIntensity": 1,
        "ambientLightIntensity": 0.5
    },
    "scene": []
}
```

### Test in VSCode

1. Save the RSF file (e.g., `example.rsf`)
2. Open it in VSCode with the Honeycomb extension
3. The plugin will load automatically
4. Switch to the "Plans" tab to see:
   - Plan selector with "Example Plan"
   - Activity list with two waypoints
   - Activity settings (click an activity)
   - Plan settings tab with max speed and path visibility

## Creating Your Own Plugin

See [../PLUGINS.md](../PLUGINS.md) for full documentation.

### Quick Start

1. Copy `example-plugin.ts` as a template
2. Modify the activity types, settings, and behavior
3. Compile to JavaScript
4. Reference in your RSF file's `plugins` array
5. Open the RSF in VSCode

### Tips

- Use `console.log()` for debugging - check VSCode Developer Tools (Help > Toggle Developer Tools)
- Activities must extend `Object3D` and implement `ActivityObject<S>`
- React components use `React.createElement()` (or JSX if your build supports it)
- Plan globals are namespaced by provider ID to avoid collisions
- Tools activate/deactivate the viewer - clean up properly in `deactivate()`
- Global panels can access viewer state via React hooks if needed

## Troubleshooting

**Plugin doesn't load:**
- Check the browser console (VSCode Developer Tools)
- Verify the plugin path is correct (use `file://` URLs for local files)
- Ensure the plugin exports `default` with an object containing `activate()`

**Activities don't appear:**
- Check that `registerActivity()` was called in `activate()`
- Verify the activity type matches what's in the RSF
- Check console for registration errors

**Settings don't show:**
- Make sure `SettingsComponent` is defined on the provider
- Check that React elements are created correctly
- Verify the component is being called with the right props

**Types not found:**
- Import types from `'@gov.nasa.jpl.honeycomb/vscode-common/plugins'`
- Make sure `@gov.nasa.jpl.honeycomb/core` is available for `Viewer`, `Object3D`, etc.
- Use `--skipLibCheck` when compiling if needed
