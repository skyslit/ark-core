import { useState, useEffect, useCallback } from 'react';
import { ManifestManager, InvalidManifestError } from '@skyslit/ark-devtools';
import { useAutomator } from './automator';
import { ProcessRegistryType, Registry } from '../registry';

type Screens = 'boot' | 'panel' | 'automator' | 'error';
export type MasterOptions = {
  disableAutoBoot: boolean;
  cwd: string;
};

/**
 * Master controller
 * @param {Partial<MasterOptions>} opts
 * @param {Partial<ProcessRegistryType>} processRegistry
 * @return {any}
 */
export default function (
  opts?: Partial<MasterOptions>,
  processRegistry?: Partial<ProcessRegistryType>
) {
  // Normalise
  opts = Object.assign<MasterOptions, Partial<MasterOptions>>(
    {
      disableAutoBoot: false,
      cwd: process.cwd(),
    },
    opts || {}
  );

  processRegistry = Object.assign<
    ProcessRegistryType,
    Partial<ProcessRegistryType>
  >(Registry, processRegistry || {});

  const manager = new ManifestManager(opts.cwd);
  const [errorData, setErrorData] = useState(null);
  const [screen, setScreen] = useState<Screens>('boot');
  const {
    isActive,
    run,
    activePrompt,
    hasPrompt,
    returnPromptResponse,
  } = useAutomator({ cwd: opts.cwd });

  const setError = useCallback((err: any) => {
    setErrorData(err);
    setScreen('error');
  }, []);

  const runProcess = useCallback((automatorKey: keyof ProcessRegistryType) => {
    if (isActive === true) {
      throw new Error('Automator is already running a process');
    }
    if (!processRegistry[automatorKey]) {
      throw new Error(`Automator key is not found ${automatorKey}`);
    }
    run(processRegistry[automatorKey]);
  }, []);

  const boot = useCallback(() => {
    console.clear();
    try {
      if (manager.load('package', true) === false) {
        runProcess('new-project');
      }
      setScreen('panel');
    } catch (e) {
      if (e instanceof InvalidManifestError) {
        setError(e);
      } else {
        throw e;
      }
    }
  }, []);

  if (opts.disableAutoBoot === false) {
    useEffect(() => {
      boot();
    }, []);

    useEffect(() => {
      process.stdin.resume();
    }, [isActive]);
  }

  return {
    screen: isActive === true ? 'automator' : screen,
    errorData,
    runProcess,
    activePrompt,
    hasPrompt,
    returnPromptResponse,
  };
}
