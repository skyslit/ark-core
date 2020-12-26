import SetupProject from './automation/processes/SetupProject';
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
};
