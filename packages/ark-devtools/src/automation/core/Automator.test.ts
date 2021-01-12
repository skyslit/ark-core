import { createProcess, Job, TestMonitor } from './Automator';

let rocketsLaunched: string[] = [];

const isro = {
  launchRocket: (name: string) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        rocketsLaunched.push(name);
        resolve(null);
      }, 10);
    });
  },
  launchRocketSlow: (name: string) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        rocketsLaunched.push(name);
        resolve(null);
      }, 70);
    });
  },
};

describe('automator real-world usage', () => {
  beforeEach(() => (rocketsLaunched = []));

  test('async order of execution check', (done) => {
    const task = createProcess((automator) => {
      automator.step(function* () {
        yield isro.launchRocket('SLV');
        yield isro.launchRocketSlow('ASLV');
        yield isro.launchRocket('GSLV Mk III.');
      });

      automator.step(function* () {
        yield isro.launchRocketSlow('PSLV.');
        yield isro.launchRocket('RLV-TD.');
        yield isro.launchRocket('Scramjet Engine - TD.');
      });
    });
    task
      .start(new Job())
      .then(() => {
        expect(rocketsLaunched).toStrictEqual([
          'SLV',
          'ASLV',
          'GSLV Mk III.',
          'PSLV.',
          'RLV-TD.',
          'Scramjet Engine - TD.',
        ]);
        done();
      })
      .catch(done);
  });

  test('error handling', async () => {
    const output: any[] = [];

    const taskPre = createProcess((automator) => {
      automator.step(function* () {
        output.push('PRE:TEST_CONTENT_0');
      });
    });

    const task = createProcess((automator) => {
      automator.step(function* () {
        output.push('TEST_CONTENT_0');
      });

      automator.step(function* () {
        output.push('TEST_CONTENT');
        throw new Error('Intentional mistakes');
      });

      automator.step(function* () {
        output.push('TEST_CONTENT_1');
      });
    });

    const taskPost = createProcess((automator) => {
      automator.step(function* () {
        output.push('POST:TEST_CONTENT_0');
      });
    });

    const job = new Job();

    job.queueAutomator(taskPre);
    job.queueAutomator(task);
    job.queueAutomator(taskPost);

    await job.start();

    // Steps should be stopped executing
    expect(output.length).toBe(3);
    expect(output[0]).toEqual('PRE:TEST_CONTENT_0');

    // Expect global errors
    expect(job.hasErrors()).toBe(true);
    expect(job.errors.length).toEqual(1);
    expect(job.errors[0].message).toEqual('Intentional mistakes');

    // Expect task / automator level errors
    expect(job.automations[0].status).toEqual('completed');
    expect(job.automations[1].status).toEqual('error');
    expect(job.automations[2].status).toEqual('skipped');

    // Expect step level errors
    expect(job.automations[0].steps[0].status).toEqual('completed');

    expect(job.automations[1].steps[0].status).toEqual('completed');
    expect(job.automations[1].steps[1].status).toEqual('error');
    expect(job.automations[1].steps[2].status).toEqual('skipped');

    expect(job.automations[2].steps[0].status).toEqual('skipped');
  });

  test('prompt', (done) => {
    const task = createProcess((automator) => {
      automator.step(function* () {
        yield isro.launchRocket('SLV');
        yield isro.launchRocketSlow('ASLV');
        const answer = yield automator.prompt({
          key: 'sample-input',
          question: 'Sample Prompt',
          type: 'text-input',
        });
        yield isro.launchRocket(answer as any);
        yield isro.launchRocket('GSLV Mk III.');
      });

      automator.step(function* () {
        yield isro.launchRocketSlow('PSLV.');
        yield isro.launchRocket('RLV-TD.');
        yield isro.launchRocket('Scramjet Engine - TD.');
      });
    });
    task
      .start(
        new Job(
          new TestMonitor({
            'sample-input': 'Sounding Rockets',
          })
        )
      )
      .then(() => {
        expect(rocketsLaunched).toStrictEqual([
          'SLV',
          'ASLV',
          'Sounding Rockets',
          'GSLV Mk III.',
          'PSLV.',
          'RLV-TD.',
          'Scramjet Engine - TD.',
        ]);
        done();
      })
      .catch(done);
  });

  test('set / get data', async () => {
    const task = createProcess((automator) => {
      // Set data
      automator.step(function* () {
        const TEST_KEY = automator.setData('TEST_KEY', 'HELLO');
        // Expecting set data return
        expect(TEST_KEY).toEqual('HELLO');
      });

      // Get data
      automator.step(function* () {
        const TEST_KEY = automator.getData('TEST_KEY');
        expect(TEST_KEY).toEqual('HELLO');
      });

      // Get default data
      automator.step(function* () {
        const NOT_EXIST_KEY = automator.getData(
          'NOT_EXIST_KEY',
          'DEFAULT_VALUE'
        );
        expect(NOT_EXIST_KEY).toEqual('DEFAULT_VALUE');
      });

      // Set default data (null)
      automator.step(function* () {
        automator.setData('NULL_KEY', null);
      });

      // Get default data (null)
      automator.step(function* () {
        const NULL_KEY = automator.getData('NULL_KEY', 'DEFAULT_NULL_VALUE');
        expect(NULL_KEY).toEqual(null);
      });

      // Set default data (null)
      automator.step(function* () {
        automator.setData('UNDEFINED_KEY', undefined);
      });

      // Get default data (null)
      automator.step(function* () {
        const UNDEFINED_KEY = automator.getData(
          'UNDEFINED_KEY',
          'DEFAULT_NULL_VALUE'
        );
        expect(UNDEFINED_KEY).toEqual('DEFAULT_NULL_VALUE');
      });
    });

    await task.start();
  });

  test('getSnapshot() fn', async () => {
    const task = createProcess((automator) => {
      automator.step(function* () {
        yield automator.prompt({
          key: 'step-1',
          question: 'step-1',
          type: 'text-input',
        });
      });
    });

    await task.start(
      new Job({
        onSnapshot: (event, snapshot) => {
          switch (event) {
            case 'init': {
              // console.log(snapshot);
              break;
            }
            default: {
              // console.log(snapshot);
              break;
            }
          }
        },
        onNewPrompt: (prompt, answer) => {
          answer(true);
        },
      })
    );
  });

  test('add more step during automation runtime', async () => {
    const results: string[] = [];
    const delay = (ms: number) =>
      new Promise((r) => setTimeout(() => r(null), ms));
    const task = createProcess((automator) => {
      automator.step(function* () {
        results.push('Step 1 Hit');

        // Push new step to this automator
        automator.step(function* () {
          results.push('Step 2 Hit');
        });

        // Push new automator to job
        automator.job.queueAutomator(
          createProcess((innerAutomator) => {
            innerAutomator.step(function* () {
              expect(innerAutomator.job).toBeTruthy();
              results.push('Automator 2 > Step 1 Hit');
            });
          })
        );

        expect(results).toHaveLength(1);
        expect(results[0]).toEqual('Step 1 Hit');

        yield delay(1000);
      });
    });

    await task.start();

    expect(results).toHaveLength(3);
    expect(results[1]).toEqual('Step 2 Hit');
    expect(results[2]).toEqual('Automator 2 > Step 1 Hit');
  });
});
