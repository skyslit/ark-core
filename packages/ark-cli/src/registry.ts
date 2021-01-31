import { Automator, Automations } from '@skyslit/ark-devtools';

export type ProcessRegistryType = {
  'new-project': () => Automator;
  sync: () => Automator;
};

export const Registry: ProcessRegistryType = {
  'new-project': Automations.processes.writePackageManifest,
  sync: Automations.processes.SyncProcess,
};
