import {renderHook} from '@testing-library/react-hooks';
import useMasterController, {MasterOptions} from '../hooks/master';
import {ProcessRegistryType} from '../registry';
import {ManifestUtils, Automations} from '@skyslit/ark-devtools';
import fs from 'fs';

jest.mock('fs', () => {
  const memfs = require('memfs');
  const vol = memfs.Volume.fromJSON({}, '/');

  const vfs = memfs.createFsFromVolume(vol);
  return vfs;
});

const options: Partial<MasterOptions> = {
  cwd: '/',
};

describe('new dir (without project)', () => {
  let hasNewProjectSetupRan: boolean = false;

  const testProcessRegistry: Partial<ProcessRegistryType> = {
    'new-project': Automations.utils.createProcess(() => {
      hasNewProjectSetupRan = true;
    }),
  };

  test('app should launch in automator', async () => {
    const {
      result,
      waitForNextUpdate,
    } = renderHook(() => useMasterController(options, testProcessRegistry));
    await waitForNextUpdate();
    expect(result.current.screen).toBe('automator');
    expect(hasNewProjectSetupRan).toEqual(true);
  });
});

describe('existing project', () => {
  beforeAll(() => {
    fs.writeFileSync('/ark.manifest.json', JSON.stringify(
        ManifestUtils.createManifest({

        })
    ));
  });

  test('app should launch in panel', () => {
    const {result} = renderHook(() => useMasterController(options));
    expect(result.current.screen).toBe('panel');
  });
});

describe('automation', () => {
  test('cli prompt should be working', () => {
    expect(true).toBe(false);
  });
});
