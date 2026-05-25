# VSCode Extension - Recent Changes

## Fixed: Webview to Extension Communication

### Issue
Messages from the webview weren't reaching the extension host because we were using `window.postMessage()` instead of the VSCode webview API.

### Solution
Updated [web/index.tsx](web/index.tsx) to use `acquireVsCodeApi()` and `vscode.postMessage()`:

```typescript
const vscode = acquireVsCodeApi();

// Now works correctly:
vscode.postMessage({
    type: 'updateRsf',
    content: JSON.stringify(rsf, null, 2)
});
```

### Affected Functions
- `handleUpdate()` - Updates RSF file when scene changes
- `handleMigrate()` - Saves migrated RSF 2.0 file

## Fixed: Default Quaternion Values

### Issue
`createDefaultSceneObject()` was creating RSF 1.0 format objects (arrays) instead of RSF 2.0 format (kinematic channels). When creating new objects, we need to ensure the quaternion has a valid identity value (w=1).

### Solution
Updated [web/lib/sceneUtils.ts](web/lib/sceneUtils.ts) to:

1. Create proper RSF 2.0 channel-based objects
2. Use identity quaternion with **w=1** for default orientation:

```typescript
function createDefaultOrientation(): Orientation {
    return {
        type: OrientationConvention.jpl,
        x: createConstantChannel(0),
        y: createConstantChannel(0),
        z: createConstantChannel(0),
        w: createConstantChannel(1), // Identity quaternion ✓
    };
}
```

### Why This Matters
Quaternions represent rotations. The identity quaternion (no rotation) is:
- ✅ `[0, 0, 0, 1]` (x, y, z, w) - Correct
- ❌ `[0, 0, 0, 0]` - Invalid (undefined rotation)

All default objects now use the correct identity quaternion.

## Fixed: Source Maps for Debugging

### Issue
Breakpoints weren't working in TypeScript source files because webpack was using `'nosources-source-map'` which doesn't embed source content.

### Solution
Updated [webpack.config.ts](webpack.config.ts):

```typescript
// Development: full source maps
devtool: env?.production ? 'nosources-source-map' : 'source-map'
```

Updated [.vscode/launch.json](../.vscode/launch.json):
```json
{
  "sourceMaps": true,
  "sourceMapPathOverrides": {
    "webpack://honeycomb-vscode/*": "${workspaceFolder}/app/vscode/*"
  }
}
```

### How to Debug
1. Press **F5** (uses "Watch and Run Honeycomb Extension" config)
2. Set breakpoints in TypeScript files - they now work!
3. Changes auto-rebuild in watch mode

See [DEBUG.md](DEBUG.md) for detailed debugging guide.

## RSF 2.0 Migration

### Overview
RSF files now require version 2.0 format with kinematic channels. Opening an RSF 1.0 file prompts automatic migration.

### Migration Features
- ✅ Automatic version detection
- ✅ Migration prompt UI
- ✅ Preserves all scene data
- ✅ Updates file in place
- ✅ Validates output

### Migration Defaults
- Position: `[0, 0, 0]` (origin)
- Orientation: `[0, 0, 0, 1]` (identity quaternion with w=1)
- Orientation convention: JPL (XYZW quaternion format)

See [MIGRATION-GUIDE.md](../../MIGRATION-GUIDE.md) for details.

## Common Viewer Initialization

### Overview
Grafana and VSCode now share common viewer setup code in `@gov.nasa.jpl.honeycomb/ui`.

### Shared Setup
The `initializeViewer()` function handles:
- BVH raycasting optimization
- Common model loaders (URDF, FBX, OBJ, etc.)
- Kinematics and annotation drivers
- Default viewer settings

### Usage
```typescript
import { initializeViewer } from '@gov.nasa.jpl.honeycomb/ui';

const manager = new LoadingManager();
const viewer = new VscodeHoneycombViewer();

// Initialize with shared setup
initializeViewer(viewer, manager);
```

Both Grafana and VSCode use the same initialization, reducing code duplication.

## File Changes Summary

### Modified Files
- `web/index.tsx` - Fixed webview messaging, added migration prompt
- `web/lib/sceneUtils.ts` - Fixed default object creation (RSF 2.0 channels, w=1)
- `webpack.config.ts` - Fixed source maps for debugging
- `package.json` - Updated build scripts for dev/production
- `.vscode/launch.json` - Added source map overrides, watch config

### New Files
- `common/migration.ts` - RSF 1.0 → 2.0 migration utilities
- `common/rsf.ts` - RSF 2.0 TypeScript interfaces
- `DEBUG.md` - Debugging guide
- `../../MIGRATION-GUIDE.md` - Migration documentation
- `../../RSF-2.0-SPECIFICATION.md` - Complete format specification

### Removed Files
- `web/lib/rsfToSceneObject.ts` - No longer needed (RSF 2.0 matches core format)

## Next Steps

### Optional Improvements
1. Add state history support for offline playback (already in spec)
2. Add animators for kinematic playback in VSCode
3. Add UI for creating/editing scene objects
4. Add UI for editing kinematic channels

### Known Limitations
- Webview debugging uses separate DevTools (Cmd+Shift+P → "Open Webview Developer Tools")
- State history not yet implemented (structure is defined)
- No animation playback UI yet (viewer supports it)
