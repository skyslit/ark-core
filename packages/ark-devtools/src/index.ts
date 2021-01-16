import SetupProject from './automation/processes/SetupProject/SetupProject';
import AddModule from './automation/processes/AddModule/AddModule';
import LongTestProcess from './automation/processes/LongTestProcess/TestProcess';
import SyncProcess from './automation/processes/Sync/SyncProject';
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
export { BackendBuilder } from './builders/BackendBuilder';
export { SPABuilder } from './builders/FrontendBuilder';

export const Automations = {
  processes: {
    SetupProject,
    AddModule,
    LongTestProcess,
    SyncProcess,
  },
  utils: {
    createProcess,
  },
};
