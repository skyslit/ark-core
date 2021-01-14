import { useState, useCallback } from 'react';
import { ManifestManager, InvalidManifestError } from '@skyslit/ark-devtools';
import { useAutomator } from './automator';
import { ProcessRegistryType, Registry } from '../registry';
import commandLineArgs from 'command-line-args';

type Mode = 'command' | 'help' | 'normal';

type Screens = 'boot' | 'panel' | 'automator' | 'error';
export type MasterOptions = {
  cwd: string;
  mode: Mode;
  options?: commandLineArgs.CommandLineOptions;
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
      cwd: process.cwd(),
      mode: 'normal',
      options: {},
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
    jobSnapshot,
    hideJobPanel,
    showJobPanel,
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
    return run(processRegistry[automatorKey]);
  }, []);

  const boot = useCallback(async () => {
    try {
      if (manager.load('package', true) === false) {
        return await runProcess('new-project');
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

  return {
    screen: isActive === true ? 'automator' : screen,
    errorData,
    activePrompt,
    hasPrompt,
    jobSnapshot,
    startupOptions: opts.options,
    isJobActive: isActive,
    boot,
    runProcess,
    returnPromptResponse,
    hideJobPanel,
    showJobPanel,
  };
}
