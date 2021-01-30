import { Automator, Automations } from '@skyslit/ark-devtools';

export type ProcessRegistryType = {
  'new-project': () => Automator;
  'add-module': () => Automator;
  sync: () => Automator;
};

export const Registry: ProcessRegistryType = {
  'new-project': Automations.processes.SetupProject,
  'add-module': Automations.processes.AddModule,
  sync: Automations.processes.SyncProcess,
};
