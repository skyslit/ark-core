import { act, renderHook } from '@testing-library/react-hooks';
import useMasterController, { MasterOptions } from '../hooks/master';
import { ProcessRegistryType } from '../registry';
import { ManifestUtils, Automations } from '@skyslit/ark-devtools';
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
    'new-project': Automations.utils.createProcess((automator) => {
      automator.run(function* () {
        hasNewProjectSetupRan = true;
      });
    }),
  };

  test('app should launch in automator', async () => {
    const { waitForNextUpdate } = renderHook(() =>
      useMasterController(options, testProcessRegistry)
    );
    await waitForNextUpdate();
    expect(hasNewProjectSetupRan).toEqual(true);
  });
});

describe('existing project', () => {
  beforeAll(() => {
    fs.writeFileSync(
      '/ark.manifest.json',
      JSON.stringify(ManifestUtils.createManifest({}))
    );
  });

  test('app should launch in panel', () => {
    const { result } = renderHook(() => useMasterController(options));
    expect(result.current.screen).toBe('panel');
  });
});

describe('automation', () => {
  test('cli prompt should be working', async () => {
    let promptResponse: string;
    const { result, waitForNextUpdate } = renderHook(() =>
      useMasterController(options, {
        // @ts-ignore
        __test__prompt: Automations.utils.createProcess((automator) => {
          automator.run(function* () {
            promptResponse = yield automator.prompt({
              key: '__test__p_key',
              question: 'Which is the tallest building in the world?',
              type: 'text-input',
            });
          });
        }),
      })
    );
    expect(result.current.screen).toBe('panel');
    expect(result.current.hasPrompt).toBe(false);
    act(() => {
      result.current.runProcess('__test__prompt' as any);
    });
    await waitForNextUpdate();
    expect(result.current.hasPrompt).toBe(true);
    act(() => {
      result.current.returnPromptResponse('test-response-123');
    });
    await waitForNextUpdate();
    expect(promptResponse).toBe('test-response-123');
  });
});
