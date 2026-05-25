import {
    Scene,
    SceneObject,
    SceneObjectType,
    SceneOptions,
    Position,
    Orientation,
    OrientationConvention,
    ChannelType,
    KinematicChannel,
    ModelSceneObject,
    FrameSceneObject,
    AnnotationSceneObject,
} from "@gov.nasa.jpl.honeycomb/core";
import { UpOrientation } from "@gov.nasa.jpl.honeycomb/scene-viewers";
import { RSF } from "./rsf";

/**
 * RSF 1.0 format (legacy)
 *
 * RSF 1.0 used simple array-based positions and orientations
 * without kinematic channels. It also used 'pose' field and
 * 'frame' array instead of 'parent' reference.
 */
export interface RSF1SceneObjectBase {
    id?: string;
    type?: string;
    name?: string;
    description?: string;

    // RSF 1.0 used 'pose' with static arrays
    pose?: {
        position?: [number, number, number];
        orientation?: [number, number, number, number]; // XYZW quaternion
    };

    // RSF 1.0 also allowed direct position/orientation arrays
    position?: [number, number, number];
    orientation?: [number, number, number, number];

    // RSF 1.0 used frame path array instead of parent reference
    frame?: string | string[];

    // Other fields
    label?: {
        text: string;
        x: number;
        y: number;
        z: number;
    };
    tags?: string[];

    // Type-specific fields
    model?: {
        type?: string;
        path: string;
        options?: any;
    };
    annotation?: any;
}

export interface RSF1Options {
    playbackSpeed?: number;
    gridVisibility?: boolean;
    up?: string;
    viewCube?: boolean;
    lightDirection?: [number, number, number];
    lightIntensity?: number;
    ambientLightIntensity?: number;
    sunAzimuth?: number;
    sunElevation?: number;
    camera?: any;
}

export interface RSF1 {
    // No version field in RSF 1.0
    options?: RSF1Options;
    scene?: RSF1SceneObjectBase[];
}

/**
 * Detect if an RSF file is version 1.0 or 2.0
 */
export function detectRSFVersion(rsf: any): "1.0" | "2.0" | "unknown" {
    if (rsf && rsf.version === "2.0") {
        return "2.0";
    }

    // Check for RSF 1.0 patterns
    if (rsf && rsf.scene && Array.isArray(rsf.scene)) {
        const firstObj = rsf.scene[0];
        if (firstObj) {
            // RSF 1.0 uses array-based position/orientation or pose
            if (
                (firstObj.position && Array.isArray(firstObj.position)) ||
                (firstObj.pose && typeof firstObj.pose === 'object')
            ) {
                return "1.0";
            }
        }
    }

    return "unknown";
}

/**
 * Create a constant kinematic channel
 */
function createConstantChannel(value: number): KinematicChannel {
    return {
        type: ChannelType.constant,
        interpolate: false,
        value,
    };
}

/**
 * Convert array position to Position channels
 */
function arrayToPosition(arr: [number, number, number]): Position {
    return {
        x: createConstantChannel(arr[0]),
        y: createConstantChannel(arr[1]),
        z: createConstantChannel(arr[2]),
    };
}

/**
 * Convert array orientation (XYZW quaternion) to Orientation channels
 */
function arrayToOrientation(arr: [number, number, number, number]): Orientation {
    return {
        type: OrientationConvention.jpl, // XYZW
        x: createConstantChannel(arr[0]),
        y: createConstantChannel(arr[1]),
        z: createConstantChannel(arr[2]),
        w: createConstantChannel(arr[3]),
    };
}

/**
 * Generate a unique ID if missing
 */
function ensureId(obj: RSF1SceneObjectBase, index: number): string {
    if (obj.id) {
        return obj.id;
    }
    return `migrated-obj-${index}-${Date.now()}`;
}

/**
 * Convert RSF 1.0 scene object to RSF 2.0
 */
function migrateSceneObject(
    obj: RSF1SceneObjectBase,
    index: number,
    nameToIdMap: Map<string, string>
): SceneObject {
    const id = ensureId(obj, index);
    const name = obj.name || `Object ${index}`;
    const type = obj.type as SceneObjectType || SceneObjectType.frame;

    // Determine position from pose or direct position field
    let posArray: [number, number, number] = [0, 0, 0];
    if (obj.pose?.position) {
        posArray = obj.pose.position;
    } else if (obj.position) {
        posArray = obj.position;
    }

    // Determine orientation from pose or direct orientation field
    let oriArray: [number, number, number, number] = [0, 0, 0, 1];
    if (obj.pose?.orientation) {
        oriArray = obj.pose.orientation;
    } else if (obj.orientation) {
        oriArray = obj.orientation;
    }

    const position = arrayToPosition(posArray);
    const orientation = arrayToOrientation(oriArray);

    // Convert frame array to parent reference
    let parent: string | null = null;
    if (obj.frame) {
        if (Array.isArray(obj.frame) && obj.frame.length > 0) {
            // Take the last frame in the path as immediate parent
            const parentName = obj.frame[obj.frame.length - 1];
            const parentId = nameToIdMap.get(parentName);
            if (parentId) {
                parent = parentId;
            }
        } else if (typeof obj.frame === 'string') {
            const parentId = nameToIdMap.get(obj.frame);
            if (parentId) {
                parent = parentId;
            }
        }
    }

    // Base object
    const base: any = {
        id,
        type,
        name,
        description: obj.description,
        parent,
        position,
        orientation,
        label: obj.label,
        tags: obj.tags,
    };

    // Type-specific fields
    if (type === SceneObjectType.model && obj.model) {
        return {
            ...base,
            model: obj.model,
        } as ModelSceneObject;
    } else if (type === SceneObjectType.annotation && obj.annotation) {
        return {
            ...base,
            annotation: obj.annotation,
        } as AnnotationSceneObject;
    } else {
        return {
            ...base,
        } as FrameSceneObject;
    }
}

/**
 * Migrate RSF 1.0 options to RSF 2.0
 */
function migrateOptions(options?: RSF1Options): SceneOptions {
    return {
        playbackSpeed: options?.playbackSpeed ?? 1,
        gridVisibility: options?.gridVisibility ?? true,
        up: (options?.up as UpOrientation) || "+Z",
        viewCube: options?.viewCube ?? true,
        lightDirection: options?.lightDirection || [1, 1, -1],
        lightIntensity: options?.lightIntensity ?? 1,
        ambientLightIntensity: options?.ambientLightIntensity ?? 0.5,
        sunAzimuth: options?.sunAzimuth,
        sunElevation: options?.sunElevation,
        camera: options?.camera,
    };
}

/**
 * Migrate RSF 1.0 to RSF 2.0
 *
 * Converts legacy format with array-based positions and pose fields
 * to new format with kinematic channels and parent references.
 *
 * @param rsf1 RSF 1.0 format object
 * @returns RSF 2.0 format object
 */
export function migrateRSF1toRSF2(rsf1: RSF1): RSF {
    const scene = rsf1.scene || [];

    // First pass: build name-to-id map for parent resolution
    const nameToIdMap = new Map<string, string>();
    scene.forEach((obj, index) => {
        const id = ensureId(obj, index);
        if (obj.name) {
            nameToIdMap.set(obj.name, id);
        }
    });

    // Second pass: migrate all scene objects
    const migratedScene = scene.map((obj, index) =>
        migrateSceneObject(obj, index, nameToIdMap)
    );

    return {
        version: "2.0",
        options: migrateOptions(rsf1.options),
        scene: migratedScene,
        // No state history in RSF 1.0
        stateHistory: undefined,
    };
}

/**
 * Migrate any RSF format to RSF 2.0
 *
 * Automatically detects version and migrates if needed.
 *
 * @param rsf RSF file content (any version)
 * @returns RSF 2.0 format object
 * @throws Error if version is unknown or unsupported
 */
export function migrateToRSF2(rsf: any): RSF {
    const version = detectRSFVersion(rsf);

    switch (version) {
        case "2.0":
            // Already RSF 2.0, return as-is (with validation)
            return rsf as RSF;

        case "1.0":
            // Migrate from RSF 1.0
            return migrateRSF1toRSF2(rsf as RSF1);

        case "unknown":
        default:
            throw new Error(
                "Unknown RSF format version. Cannot migrate to RSF 2.0. " +
                "Please ensure the file is a valid RSF 1.0 or 2.0 format."
            );
    }
}

/**
 * Validate that an object is a valid RSF 2.0 format
 *
 * Performs basic structural validation to ensure required fields exist.
 *
 * @param rsf Object to validate
 * @returns true if valid, false otherwise
 */
export function validateRSF2(rsf: any): rsf is RSF {
    if (!rsf || typeof rsf !== 'object') {
        return false;
    }

    if (rsf.version !== "2.0") {
        return false;
    }

    if (!rsf.options || typeof rsf.options !== 'object') {
        return false;
    }

    if (!Array.isArray(rsf.scene)) {
        return false;
    }

    // Validate each scene object has required fields
    for (const obj of rsf.scene) {
        if (!obj.id || !obj.type || !obj.name) {
            return false;
        }

        if (!obj.position || !obj.orientation) {
            return false;
        }

        // Check that position/orientation are channel objects
        if (
            typeof obj.position !== 'object' ||
            !obj.position.x ||
            !obj.position.y ||
            !obj.position.z
        ) {
            return false;
        }

        if (
            typeof obj.orientation !== 'object' ||
            !obj.orientation.x ||
            !obj.orientation.y ||
            !obj.orientation.z ||
            !obj.orientation.w
        ) {
            return false;
        }
    }

    return true;
}
