import { useCallback, useState } from 'react';
// import {BackendBuilder, SPABuilder} from '@skyslit/ark-devtools';

type ProcessStatus = 'started' | 'ended';

type Target = {
  name: string;
  status: ProcessStatus;
};

// eslint-disable-next-line no-unused-vars
type BuilderSnapshot = {
  targets: Array<Target>;
  errors: Array<any>;
  warnings: Array<any>;
  status: ProcessStatus;
};

type Options = {
  cwd: string;
};

export const useBuilder = (opts: Options) => {
  // Normalise
  opts = Object.assign<Options, Partial<Options>>(
    {
      cwd: process.cwd(),
    },
    opts || {}
  );

  const [builders] = useState<Array<BuilderSnapshot>>([]);

  const build = useCallback(() => {
    // Find all apps
    // For every app create a builder
    // Update builder snapshot
  }, []);

  return {
    builders,
    build,
  };
};
