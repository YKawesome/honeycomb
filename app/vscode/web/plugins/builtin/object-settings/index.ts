import type { HoneycombPlugin, PluginContext } from '../../../../common/plugins';
import { Object3DSettingsProvider } from './Object3DSettings';
import { TerrainSettingsProvider } from './TerrainSettings';
import { RobotSettingsProvider } from './RobotSettings';

/**
 * Builtin plugin that registers core object settings panes
 */
const plugin: HoneycombPlugin = {
    activate(context: PluginContext) {
        // Register channel-based core object settings (name, description, position, orientation with channels)
        context.registerObjectSettings(Object3DSettingsProvider);

        // Register terrain-specific settings
        context.registerObjectSettings(TerrainSettingsProvider);

        // Register robot joint settings
        context.registerObjectSettings(RobotSettingsProvider);

        console.log('Builtin object settings plugin activated');
    },

    deactivate() {
        console.log('Builtin object settings plugin deactivated');
    },
};

export default plugin;
