import { ManifestPlugin } from '../utils/ManifestManager';
import setupPlugins from './projectSetup';

/**
 * Register all plugins
 * @return {Array<ManifestPlugin>}
 */
const getAllPlugins = (): Array<ManifestPlugin> => [
  setupPlugins.setup(),
  setupPlugins.setupMainService(),
];

export default getAllPlugins;
