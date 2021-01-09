import { Automator, Automations } from '@skyslit/ark-devtools';

export type ProcessRegistryType = {
  'new-project': () => Automator;
  'add-module': () => Automator;
};

export const Registry: ProcessRegistryType = {
  'new-project': Automations.processes.SetupProject,
  'add-module': Automations.processes.AddModule,
};
