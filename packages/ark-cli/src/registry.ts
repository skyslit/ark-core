import {Automator, Automations} from '@skyslit/ark-devtools';

export type ProcessRegistryType = {
  'new-project': Automator
}

export const Registry: ProcessRegistryType = {
  'new-project': Automations.processes.SetupProject,
};
