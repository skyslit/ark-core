import { renderHook, act } from '@testing-library/react-hooks';
import useApp from './master';
import fs from 'fs';
import rimraf from 'rimraf';
import { ManifestManager } from '@skyslit/ark-devtools';
import { Automations } from '@skyslit/ark-devtools';

const testDirectory: string = '/test-project';

jest.mock('fs', () => {
  const memfs = require('memfs');
  return memfs.createFsFromVolume(memfs.Volume.fromJSON({}, '/test-project'));
});

describe('master', () => {
  beforeEach(() => {
    rimraf.sync(testDirectory);
    fs.mkdirSync(testDirectory, { recursive: true });
  });

  test(
    'should land in automator',
    async () => {
      const { result } = renderHook(() =>
        useApp({
          cwd: testDirectory,
        })
      );

      await act(async () => {
        result.current.boot();
        await new Promise((r) => setTimeout(r, 3000));
      });

      expect(result.current.screen).toStrictEqual('automator');
      expect(result.current.isJobActive).toStrictEqual(true);
    },
    10 * 1000
  );

  test('should land in panel', async () => {
    const manager = new ManifestManager(testDirectory);
    manager.write('package');

    const { result } = renderHook(() =>
      useApp({
        cwd: testDirectory,
      })
    );

    await act(async () => {
      await result.current.boot();
    });

    expect(result.current.screen).toStrictEqual('panel');
  });
});

describe('automator', () => {
  const delay = (ms: number) =>
    new Promise((resolve, reject) => setTimeout(resolve, ms));

  const LongTestProcess = () =>
    Automations.utils.createProcess((automator) => {
      new Array(3).fill(null).forEach((_, index) => {
        // Initialise npm package
        automator.step(function* () {
          yield delay(300);
          automator.job.queueAutomator(
            Automations.utils.createProcess((automator) => {
              automator.step(function* () {
                yield delay(100);
              });
            })
          );
        });
      });
    });

  const ProcessWithPrompt = () =>
    Automations.utils.createProcess((automator) => {
      automator.step(function* () {
        yield automator.prompt({
          key: 'p-1',
          question: 'What is answer 1?',
          type: 'text-input',
        });
      });
      automator.step(function* () {
        yield automator.prompt({
          key: 'p-2',
          question: 'What is answer 2?',
          type: 'text-input',
        });
      });
      automator.step(function* () {
        yield delay(300);
      });
    });

  const registry: any = {
    'process-with-prompt': ProcessWithPrompt,
    'long-test-prompt': LongTestProcess,
  };

  test('should do a complete run without crashing', async () => {
    const { result } = renderHook(() =>
      useApp({ cwd: process.cwd() }, registry)
    );

    await act(async () => {
      await result.current.runProcess('long-test-prompt' as any);
    });

    expect(result.current.jobSnapshot).toBeTruthy();
    expect(result.current.jobSnapshot.hasEnded).toStrictEqual(true);
  });

  test('showJobPanel() and hideJobPanel()', () => {
    const { result } = renderHook(() =>
      useApp({ cwd: process.cwd() }, registry)
    );

    act(() => {
      result.current.showJobPanel();
    });

    expect(result.current.isJobActive).toStrictEqual(true);

    act(() => {
      result.current.hideJobPanel();
    });

    expect(result.current.isJobActive).toStrictEqual(false);
  });

  test('prompts should work', async () => {
    const { result } = renderHook(() =>
      useApp({ cwd: process.cwd() }, registry)
    );
    const automaticAnswerer = () => {
      if (result.current.hasPrompt === true) {
        if (result.current.activePrompt) {
          const qKey: string = result.current.activePrompt.key;
          switch (qKey) {
            case 'p-1': {
              result.current.returnPromptResponse('answer-1');
              break;
            }
            case 'p-2': {
              result.current.returnPromptResponse('answer-2');
              break;
            }
          }
        }
      }
    };

    await act(async () => {
      const ticker = setInterval(automaticAnswerer, 500);
      await result.current.runProcess('process-with-prompt' as any);
      clearInterval(ticker);
    });
  });
});
