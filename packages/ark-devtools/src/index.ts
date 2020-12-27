import SetupProject from './automation/processes/SetupProject';
import {createProcess} from './automation/core/Automator';
export {Job, Automator} from './automation/core/Automator';
export {
  ManifestManager,
  InvalidManifestError,
  ManifestUtils,
} from './utils/ManifestManager';

export const Automations = {
  processes: {
    SetupProject,
  },
  utils: {
    createProcess,
  },
};
