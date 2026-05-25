# Honeycomb VSCode Extension

A VSCode extension that provides 3D visualization for `.rsf` (Robot Scene Format) files using the JPL Honeycomb Framework.

## Features

- Custom editor for `.rsf` files
- Interactive 3D scene viewer with:
  - ViewCube navigation
  - Transform controls
  - Dynamic lighting
  - Focus camera controls
- Built on the Honeycomb framework with support for:
  - Kinematics
  - Annotations
  - Scene loading and rendering
  - Optimized raycasting for large terrains (via three-mesh-bvh)

## Development

### Prerequisites

- Node.js 20+
- Yarn
- VSCode

### Setup

From the repository root:

```bash
# Install dependencies
yarn install

# Build the extension
cd app/vscode
yarn compile
```

### Running the Extension

1. Open this folder in VSCode
2. Press `F5` to launch the Extension Development Host
3. In the new VSCode window, open or create a `.rsf` file
4. The Honeycomb 3D viewer will open automatically

### Watch Mode

For development with auto-rebuild:

```bash
yarn watch
```

### Building for Production

```bash
yarn package
```

This creates a production build in the `dist/` directory with optimized and minified code.

## Architecture

The extension consists of two main parts:

1. **Extension Host** (`src/extension.ts`)
   - Registers the custom text editor provider for `.rsf` files
   - Creates and manages the webview panel
   - Handles VSCode integration

2. **Webview App** (`web/`)
   - React-based 3D viewer using the Honeycomb framework
   - Implements custom viewer with mixins for various features
   - Runs in an isolated webview context

## Dependencies

This extension depends on the following Honeycomb workspace packages:

- `@gov.nasa.jpl.honeycomb/core` - Core 3D rendering engine
- `@gov.nasa.jpl.honeycomb/extensions` - Extensions like kinematics and annotations
- `@gov.nasa.jpl.honeycomb/scene-viewers` - Viewer mixins (ViewCube, FocusCam, etc.)
- `@gov.nasa.jpl.honeycomb/ui` - React components for scene loading and rendering

## License

Apache-2.0
