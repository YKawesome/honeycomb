import { SceneOptions, Scene } from "@gov.nasa.jpl.honeycomb/core";
import { UpOrientation } from "@gov.nasa.jpl.honeycomb/scene-viewers";

export type Vec3 = [x: number, y: number, z: number];

// WorldOptions is now defined in core package as SceneOptions
// Keeping this for backwards compatibility, but it should be removed eventually

export interface VscodeHoneycombOptions {
    options: SceneOptions;
    scene: Scene;
}
