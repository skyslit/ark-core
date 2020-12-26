import {
  useState,
  useEffect,
} from 'react';
import {
  ManifestManager,
  InvalidManifestError,
} from '@skyslit/ark-devtools';
import {useAutomator} from './automator';
import {ProcessRegistryType, Registry} from '../registry';

type Screens = 'boot' | 'panel' | 'automator' | 'error';
export type MasterOptions = {
  disableAutoBoot: boolean,
  cwd: string
}

/**
 * Master controller
 * @param {Partial<MasterOptions>} opts
 * @param {Partial<ProcessRegistryType>} processRegistry
 * @return {any}
 */
export default function(
    opts?: Partial<MasterOptions>,
    processRegistry?: Partial<ProcessRegistryType>) {
  // Normalise
  opts = Object.assign<MasterOptions, Partial<MasterOptions>>({
    disableAutoBoot: false,
    cwd: process.cwd(),
  }, opts || {});

  processRegistry = Object.assign<
    ProcessRegistryType,
    Partial<ProcessRegistryType>>(Registry, processRegistry || {});

  const manager = new ManifestManager(opts.cwd);
  const [errorData, setErrorData] = useState(null);
  const [screen, setScreen] = useState<Screens>('boot');
  const {isActive, run} = useAutomator();

  const setError = (err: any) => {
    setErrorData(err);
    setScreen('error');
  };

  const boot = () => {
    try {
      if (manager.load() === true) {
        setScreen('panel');
      } else {
        setScreen('automator');
        run(processRegistry['new-project']);
      }
    } catch (e) {
      if (e instanceof InvalidManifestError) {
        setError(e);
      } else {
        throw e;
      }
    }
  };

  if (opts.disableAutoBoot === false) {
    useEffect(() => {
      boot();
    }, []);
  }

  return {
    screen: isActive === true ? 'automator' : screen,
    errorData,
  };
}
