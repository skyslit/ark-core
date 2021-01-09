import SetupProject from './automation/processes/SetupProject/SetupProject';
import AddModule from './automation/processes/AddModule/AddModule';
import { createProcess } from './automation/core/Automator';
export { Job, Automator } from './automation/core/Automator';
export {
  ManifestManager,
  InvalidManifestError,
  ManifestUtils,
} from './utils/ManifestManager';

export const Automations = {
  processes: {
    SetupProject,
    AddModule,
  },
  utils: {
    createProcess,
  },
};
