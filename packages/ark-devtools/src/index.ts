import SetupProject from './automation/processes/SetupProject/SetupProject';
import AddModule from './automation/processes/AddModule/AddModule';
import LongTestProcess from './automation/processes/LongTestProcess/TestProcess';
import { createProcess } from './automation/core/Automator';
export { Job, Automator } from './automation/core/Automator';
export {
  ManifestManager,
  InvalidManifestError,
  ManifestUtils,
} from './utils/ManifestManager';
export {
  JobSnapshot,
  AutomationSnapshot,
  StepSnapshot,
  WorkerStatus,
} from './automation/core/Automator';

export const Automations = {
  processes: {
    SetupProject,
    AddModule,
    LongTestProcess,
  },
  utils: {
    createProcess,
  },
};
