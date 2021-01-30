import { ManifestPlugin } from '../utils/ManifestManager';
import setupPlugins from './projectSetup';

/**
 * Register all plugins
 * @return {Array<ManifestPlugin>}
 */
const getAllPlugins = (): Array<ManifestPlugin> => [setupPlugins.setup()];

export default getAllPlugins;
