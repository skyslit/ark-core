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

describe('getSnapshot() fn', () => {
  test('event trigger (order)', async () => {
    const output: string[] = [];

    const task1 = createProcess((automator) => {
      automator.title = 'Test title';
      automator.step(function* () {
        output.push('occurence 1');
      });
    });

    const task2 = createProcess((automator) => {
      automator.title = 'Test title';
      automator.step(function* () {
        output.push('occurence 2');
      });
      automator.step(function* () {
        output.push('occurence 2.A');
      });
    });

    const task3 = createProcess((automator) => {
      automator.title = 'Test title';
      automator.step(function* () {
        output.push('occurence 3');
      });
    });

    const job = new Job({
      onSnapshot: (event, snapshot, frameIndex) => {
        switch (frameIndex) {
          case 1: {
            // Init
            expect(snapshot.pendingAutomations).toEqual(3);
            expect(snapshot.successfulAutomations).toEqual(0);
            expect(snapshot.failedAutomations).toEqual(0);
            expect(snapshot.skippedAutomations).toEqual(0);

            expect(snapshot.pendingSteps).toEqual(4);
            expect(snapshot.successfulSteps).toEqual(0);
            expect(snapshot.failedSteps).toEqual(0);
            expect(snapshot.skippedSteps).toEqual(0);

            expect(snapshot.totalAutomations).toEqual(3);
            expect(snapshot.totalSteps).toEqual(4);
            expect(snapshot.hasEnded).toEqual(false);

            break;
          }
          case 2: {
            // Automation #1 should be in-progress
            expect(snapshot.automations[0].status).toEqual('in-progress');
            expect(snapshot.automations[0].steps[0].status).toEqual('waiting');
            break;
          }
          case 3: {
            // Automation #1 > step #1 should be in-progress
            expect(snapshot.automations[0].status).toEqual('in-progress');
            expect(snapshot.automations[0].steps[0].status).toEqual(
              'in-progress'
            );
            break;
          }
          case 4: {
            // Automation #1 > step #1 should be completed
            expect(snapshot.automations[0].status).toEqual('in-progress');
            expect(snapshot.automations[0].steps[0].status).toEqual(
              'completed'
            );

            // Meta assertion
            expect(snapshot.pendingAutomations).toEqual(3);
            expect(snapshot.successfulAutomations).toEqual(0);
            expect(snapshot.failedAutomations).toEqual(0);
            expect(snapshot.skippedAutomations).toEqual(0);

            expect(snapshot.pendingSteps).toEqual(3);
            expect(snapshot.successfulSteps).toEqual(1);
            expect(snapshot.failedSteps).toEqual(0);
            expect(snapshot.skippedSteps).toEqual(0);

            break;
          }
          case 5: {
            // Automation #1 > should be completed
            expect(snapshot.automations[0].status).toEqual('completed');
            expect(snapshot.automations[0].steps[0].status).toEqual(
              'completed'
            );

            // Meta assertion
            expect(snapshot.pendingAutomations).toEqual(2);
            expect(snapshot.successfulAutomations).toEqual(1);
            expect(snapshot.failedAutomations).toEqual(0);
            expect(snapshot.skippedAutomations).toEqual(0);

            expect(snapshot.pendingSteps).toEqual(3);
            expect(snapshot.successfulSteps).toEqual(1);
            expect(snapshot.failedSteps).toEqual(0);
            expect(snapshot.skippedSteps).toEqual(0);

            expect(snapshot.hasEnded).toEqual(false);

            break;
          }
          case 6: {
            // Automation #2 > should be in-progress
            expect(snapshot.automations[1].status).toEqual('in-progress');
            expect(snapshot.automations[1].steps[0].status).toEqual('waiting');

            break;
          }
          case 7: {
            expect(snapshot.automations[1].status).toEqual('in-progress');
            expect(snapshot.automations[1].steps[0].status).toEqual(
              'in-progress'
            );
            break;
          }
          case 8: {
            expect(snapshot.automations[1].status).toEqual('in-progress');
            expect(snapshot.automations[1].steps[0].status).toEqual(
              'completed'
            );

            // Meta assertion
            expect(snapshot.pendingAutomations).toEqual(2);
            expect(snapshot.successfulAutomations).toEqual(1);
            expect(snapshot.failedAutomations).toEqual(0);
            expect(snapshot.skippedAutomations).toEqual(0);

            expect(snapshot.pendingSteps).toEqual(2);
            expect(snapshot.successfulSteps).toEqual(2);
            expect(snapshot.failedSteps).toEqual(0);
            expect(snapshot.skippedSteps).toEqual(0);

            break;
          }
          case 9: {
            expect(snapshot.automations[1].status).toEqual('in-progress');
            expect(snapshot.automations[1].steps[1].status).toEqual(
              'in-progress'
            );
            break;
          }
          case 10: {
            expect(snapshot.automations[1].status).toEqual('in-progress');
            expect(snapshot.automations[1].steps[1].status).toEqual(
              'completed'
            );

            // Meta assertion
            expect(snapshot.pendingAutomations).toEqual(2);
            expect(snapshot.successfulAutomations).toEqual(1);
            expect(snapshot.failedAutomations).toEqual(0);
            expect(snapshot.skippedAutomations).toEqual(0);

            expect(snapshot.pendingSteps).toEqual(1);
            expect(snapshot.successfulSteps).toEqual(3);
            expect(snapshot.failedSteps).toEqual(0);
            expect(snapshot.skippedSteps).toEqual(0);

            break;
          }
          case 11: {
            expect(snapshot.automations[1].status).toEqual('completed');
            expect(snapshot.automations[1].steps[1].status).toEqual(
              'completed'
            );
            break;
          }
          case 12: {
            expect(snapshot.automations[2].status).toEqual('in-progress');
            expect(snapshot.automations[2].steps[0].status).toEqual('waiting');

            // Meta assertion
            expect(snapshot.pendingAutomations).toEqual(1);
            expect(snapshot.successfulAutomations).toEqual(2);
            expect(snapshot.failedAutomations).toEqual(0);
            expect(snapshot.skippedAutomations).toEqual(0);

            expect(snapshot.pendingSteps).toEqual(1);
            expect(snapshot.successfulSteps).toEqual(3);
            expect(snapshot.failedSteps).toEqual(0);
            expect(snapshot.skippedSteps).toEqual(0);

            break;
          }
          case 13: {
            expect(snapshot.automations[2].status).toEqual('in-progress');
            expect(snapshot.automations[2].steps[0].status).toEqual(
              'in-progress'
            );
            break;
          }
          case 14: {
            expect(snapshot.automations[2].status).toEqual('in-progress');
            expect(snapshot.automations[2].steps[0].status).toEqual(
              'completed'
            );

            // Meta assertion
            expect(snapshot.pendingAutomations).toEqual(1);
            expect(snapshot.successfulAutomations).toEqual(2);
            expect(snapshot.failedAutomations).toEqual(0);
            expect(snapshot.skippedAutomations).toEqual(0);

            expect(snapshot.pendingSteps).toEqual(0);
            expect(snapshot.successfulSteps).toEqual(4);
            expect(snapshot.failedSteps).toEqual(0);
            expect(snapshot.skippedSteps).toEqual(0);

            break;
          }
          case 15: {
            expect(snapshot.automations[2].status).toEqual('completed');
            expect(snapshot.automations[2].steps[0].status).toEqual(
              'completed'
            );

            // Meta assertion
            expect(snapshot.pendingAutomations).toEqual(0);
            expect(snapshot.successfulAutomations).toEqual(3);
            expect(snapshot.failedAutomations).toEqual(0);
            expect(snapshot.skippedAutomations).toEqual(0);

            expect(snapshot.pendingSteps).toEqual(0);
            expect(snapshot.successfulSteps).toEqual(4);
            expect(snapshot.failedSteps).toEqual(0);
            expect(snapshot.skippedSteps).toEqual(0);

            expect(snapshot.hasEnded).toEqual(true);

            break;
          }
        }
      },
      onNewPrompt: (prompt, answer) => {
        answer(true);
      },
    });

    job.queueAutomator(task1);
    job.queueAutomator(task2);
    job.queueAutomator(task3);

    // Need this for performing assertion withing the process
    job.shouldSuppressError = false;

    await job.start();

    expect(output).toHaveLength(4);
    expect(output).toEqual([
      'occurence 1',
      'occurence 2',
      'occurence 2.A',
      'occurence 3',
    ]);
  });

  test('skipping on error', async () => {
    const output: string[] = [];

    const task1 = createProcess((automator) => {
      automator.title = 'Test title';
      automator.step(function* () {
        output.push('occurence 1');
      });
    });

    const task2 = createProcess((automator) => {
      automator.title = 'Test title';
      automator.step(function* () {
        throw new Error('Intentional trigger');
      });
      automator.step(function* () {
        output.push('occurence 2.A');
      });
    });

    const task3 = createProcess((automator) => {
      automator.title = 'Test title';
      automator.step(function* () {
        output.push('occurence 3');
      });
    });

    const job = new Job({
      onSnapshot: (event, snapshot, frameIndex) => {
        switch (frameIndex) {
          case 1: {
            // Init
            expect(snapshot.pendingAutomations).toEqual(3);
            expect(snapshot.successfulAutomations).toEqual(0);
            expect(snapshot.failedAutomations).toEqual(0);
            expect(snapshot.skippedAutomations).toEqual(0);

            expect(snapshot.pendingSteps).toEqual(4);
            expect(snapshot.successfulSteps).toEqual(0);
            expect(snapshot.failedSteps).toEqual(0);
            expect(snapshot.skippedSteps).toEqual(0);

            expect(snapshot.totalAutomations).toEqual(3);
            expect(snapshot.totalSteps).toEqual(4);

            expect(snapshot.hasEnded).toEqual(false);

            break;
          }
          case 2: {
            // Automation #1 should be in-progress
            expect(snapshot.automations[0].status).toEqual('in-progress');
            expect(snapshot.automations[0].steps[0].status).toEqual('waiting');
            break;
          }
          case 3: {
            // Automation #1 > step #1 should be in-progress
            expect(snapshot.automations[0].status).toEqual('in-progress');
            expect(snapshot.automations[0].steps[0].status).toEqual(
              'in-progress'
            );
            break;
          }
          case 4: {
            // Automation #1 > step #1 should be completed
            expect(snapshot.automations[0].status).toEqual('in-progress');
            expect(snapshot.automations[0].steps[0].status).toEqual(
              'completed'
            );

            // Meta
            expect(snapshot.pendingAutomations).toEqual(3);
            expect(snapshot.successfulAutomations).toEqual(0);
            expect(snapshot.failedAutomations).toEqual(0);
            expect(snapshot.skippedAutomations).toEqual(0);

            expect(snapshot.pendingSteps).toEqual(3);
            expect(snapshot.successfulSteps).toEqual(1);
            expect(snapshot.failedSteps).toEqual(0);
            expect(snapshot.skippedSteps).toEqual(0);

            break;
          }
          case 5: {
            // Automation #1 > should be completed
            expect(snapshot.automations[0].status).toEqual('completed');
            expect(snapshot.automations[0].steps[0].status).toEqual(
              'completed'
            );

            // Meta
            expect(snapshot.pendingAutomations).toEqual(2);
            expect(snapshot.successfulAutomations).toEqual(1);
            expect(snapshot.failedAutomations).toEqual(0);
            expect(snapshot.skippedAutomations).toEqual(0);

            expect(snapshot.pendingSteps).toEqual(3);
            expect(snapshot.successfulSteps).toEqual(1);
            expect(snapshot.failedSteps).toEqual(0);
            expect(snapshot.skippedSteps).toEqual(0);

            break;
          }
          case 6: {
            // Automation #2 > should be in-progress
            expect(snapshot.automations[1].status).toEqual('in-progress');
            expect(snapshot.automations[1].steps[0].status).toEqual('waiting');
            break;
          }
          case 7: {
            expect(snapshot.automations[1].status).toEqual('in-progress');
            expect(snapshot.automations[1].steps[0].status).toEqual(
              'in-progress'
            );

            expect(snapshot.hasEnded).toEqual(false);

            break;
          }
          case 8: {
            // Running error triggering step
            expect(snapshot.automations[1].status).toEqual('in-progress');
            expect(snapshot.automations[1].steps[0].status).toEqual('error');

            // Meta
            expect(snapshot.pendingAutomations).toEqual(2);
            expect(snapshot.successfulAutomations).toEqual(1);
            expect(snapshot.failedAutomations).toEqual(0);
            expect(snapshot.skippedAutomations).toEqual(0);

            expect(snapshot.pendingSteps).toEqual(2);
            expect(snapshot.successfulSteps).toEqual(1);
            expect(snapshot.failedSteps).toEqual(1);
            expect(snapshot.skippedSteps).toEqual(0);

            expect(snapshot.hasEnded).toEqual(false);

            break;
          }
          case 9: {
            // Finding out that error happened
            expect(snapshot.automations[1].status).toEqual('error');
            expect(snapshot.automations[1].steps[0].status).toEqual('error');

            // Meta
            expect(snapshot.pendingAutomations).toEqual(1);
            expect(snapshot.successfulAutomations).toEqual(1);
            expect(snapshot.failedAutomations).toEqual(1);
            expect(snapshot.skippedAutomations).toEqual(0);

            expect(snapshot.pendingSteps).toEqual(2);
            expect(snapshot.successfulSteps).toEqual(1);
            expect(snapshot.failedSteps).toEqual(1);
            expect(snapshot.skippedSteps).toEqual(0);

            expect(snapshot.hasEnded).toEqual(false);

            break;
          }
          case 10: {
            // Running next step within same automation
            expect(snapshot.automations[1].status).toEqual('error');
            expect(snapshot.automations[1].steps[1].status).toEqual(
              'in-progress'
            );

            // Meta
            expect(snapshot.pendingAutomations).toEqual(1);
            expect(snapshot.successfulAutomations).toEqual(1);
            expect(snapshot.failedAutomations).toEqual(1);
            expect(snapshot.skippedAutomations).toEqual(0);

            expect(snapshot.pendingSteps).toEqual(2);
            expect(snapshot.successfulSteps).toEqual(1);
            expect(snapshot.failedSteps).toEqual(1);
            expect(snapshot.skippedSteps).toEqual(0);

            expect(snapshot.hasEnded).toEqual(false);

            break;
          }
          case 11: {
            // Skipping the next step because a prev action failed
            expect(snapshot.automations[1].status).toEqual('error');
            expect(snapshot.automations[1].steps[1].status).toEqual('skipped');

            // Meta
            expect(snapshot.pendingAutomations).toEqual(1);
            expect(snapshot.successfulAutomations).toEqual(1);
            expect(snapshot.failedAutomations).toEqual(1);
            expect(snapshot.skippedAutomations).toEqual(0);

            expect(snapshot.pendingSteps).toEqual(1);
            expect(snapshot.successfulSteps).toEqual(1);
            expect(snapshot.failedSteps).toEqual(1);
            expect(snapshot.skippedSteps).toEqual(1);

            break;
          }
          case 13: {
            // Running next task / automator
            expect(snapshot.automations[2].status).toEqual('in-progress');
            expect(snapshot.automations[2].steps[0].status).toEqual('waiting');

            // Meta
            expect(snapshot.pendingAutomations).toEqual(1);
            expect(snapshot.successfulAutomations).toEqual(1);
            expect(snapshot.failedAutomations).toEqual(1);
            expect(snapshot.skippedAutomations).toEqual(0);

            expect(snapshot.pendingSteps).toEqual(1);
            expect(snapshot.successfulSteps).toEqual(1);
            expect(snapshot.failedSteps).toEqual(1);
            expect(snapshot.skippedSteps).toEqual(1);

            break;
          }
          case 14: {
            // Running first step with the task / automator
            expect(snapshot.automations[2].status).toEqual('in-progress');
            expect(snapshot.automations[2].steps[0].status).toEqual(
              'in-progress'
            );
            break;
          }
          case 15: {
            // Skipping the subsequent steps
            expect(snapshot.automations[2].status).toEqual('in-progress');
            expect(snapshot.automations[2].steps[0].status).toEqual('skipped');

            // Meta
            expect(snapshot.pendingAutomations).toEqual(1);
            expect(snapshot.successfulAutomations).toEqual(1);
            expect(snapshot.failedAutomations).toEqual(1);
            expect(snapshot.skippedAutomations).toEqual(0);

            expect(snapshot.pendingSteps).toEqual(0);
            expect(snapshot.successfulSteps).toEqual(1);
            expect(snapshot.failedSteps).toEqual(1);
            expect(snapshot.skippedSteps).toEqual(2);

            expect(snapshot.hasEnded).toEqual(false);

            break;
          }
          case 16: {
            // Skiping the entire task / automation
            expect(snapshot.automations[2].status).toEqual('skipped');
            expect(snapshot.automations[2].steps[0].status).toEqual('skipped');

            // Meta
            expect(snapshot.pendingAutomations).toEqual(0);
            expect(snapshot.successfulAutomations).toEqual(1);
            expect(snapshot.failedAutomations).toEqual(1);
            expect(snapshot.skippedAutomations).toEqual(1);

            expect(snapshot.pendingSteps).toEqual(0);
            expect(snapshot.successfulSteps).toEqual(1);
            expect(snapshot.failedSteps).toEqual(1);
            expect(snapshot.skippedSteps).toEqual(2);

            expect(snapshot.hasEnded).toEqual(true);

            break;
          }
        }
      },
      onNewPrompt: (prompt, answer) => {
        answer(true);
      },
    });

    job.queueAutomator(task1);
    job.queueAutomator(task2);
    job.queueAutomator(task3);

    await job.start();
    const testErrors = job.errors.filter(
      (e) => e.message !== 'Intentional trigger'
    );
    if (testErrors.length > 0) {
      throw testErrors[0];
    }
    expect(output).toEqual(['occurence 1']);
  });

  test('observable', async () => {
    const output: string[] = [];

    const delay = (ms: number) =>
      new Promise((resolve, reject) => setTimeout(resolve, ms));

    const task1 = createProcess((automator) => {
      automator.title = 'Test title';
      automator.step(function* () {
        output.push('occurence 1');
        const observer1 = automator.createObserver('Observer 1');
        const observer2 = automator.createObserver('Observer 2');
        yield delay(300);
        const observer3 = automator.createObserver('Observer 3');
        observer1.updateStatus('completed');
        yield delay(300);
        observer2.updateStatus('completed');
        yield delay(300);
        observer3.updateStatus('completed');
      });

      automator.step(function* () {
        output.push('occurence 2');
        const observer4 = automator.createObserver('Observer 4');
        const observer5 = automator.createObserver('Observer 5');
        yield delay(300);
        observer4.updateStatus('completed');
        yield delay(300);
        observer5.updateStatus('completed');
      });
    });

    const job = new Job({
      onNewPrompt: () => {},
      onSnapshot: (event, snapshot, frameIndex) => {
        switch (frameIndex) {
          case 4: {
            const step =
              snapshot.automations[0].steps[task1.currentRunningTaskIndex];
            expect(step.observers['Observer 1']).toStrictEqual('in-progress');
            break;
          }
          case 4: {
            const step =
              snapshot.automations[0].steps[task1.currentRunningTaskIndex];
            expect(step.observers['Observer 1']).toStrictEqual('in-progress');
            expect(step.observers['Observer 2']).toStrictEqual('in-progress');
            break;
          }
          case 6: {
            const step =
              snapshot.automations[0].steps[task1.currentRunningTaskIndex];
            expect(step.observers['Observer 1']).toStrictEqual('in-progress');
            expect(step.observers['Observer 2']).toStrictEqual('in-progress');
            expect(step.observers['Observer 3']).toStrictEqual('in-progress');
            break;
          }
          case 7: {
            const step =
              snapshot.automations[0].steps[task1.currentRunningTaskIndex];
            expect(step.observers['Observer 1']).toStrictEqual('completed');
            expect(step.observers['Observer 2']).toStrictEqual('in-progress');
            expect(step.observers['Observer 3']).toStrictEqual('in-progress');
            break;
          }
          case 7: {
            const step =
              snapshot.automations[0].steps[task1.currentRunningTaskIndex];
            expect(step.observers['Observer 1']).toStrictEqual('completed');
            expect(step.observers['Observer 2']).toStrictEqual('completed');
            expect(step.observers['Observer 3']).toStrictEqual('in-progress');
            break;
          }
          case 9: {
            const step =
              snapshot.automations[0].steps[task1.currentRunningTaskIndex];
            expect(step.observers['Observer 1']).toStrictEqual('completed');
            expect(step.observers['Observer 2']).toStrictEqual('completed');
            expect(step.observers['Observer 3']).toStrictEqual('completed');
            break;
          }
          case 12: {
            const step =
              snapshot.automations[0].steps[task1.currentRunningTaskIndex];
            expect(step.observers['Observer 4']).toStrictEqual('in-progress');
            break;
          }
          case 13: {
            const step =
              snapshot.automations[0].steps[task1.currentRunningTaskIndex];
            expect(step.observers['Observer 4']).toStrictEqual('in-progress');
            expect(step.observers['Observer 5']).toStrictEqual('in-progress');
            break;
          }
          case 14: {
            const step =
              snapshot.automations[0].steps[task1.currentRunningTaskIndex];
            expect(step.observers['Observer 4']).toStrictEqual('completed');
            expect(step.observers['Observer 5']).toStrictEqual('in-progress');
            break;
          }
          case 15: {
            const step =
              snapshot.automations[0].steps[task1.currentRunningTaskIndex];
            expect(step.observers['Observer 4']).toStrictEqual('completed');
            expect(step.observers['Observer 5']).toStrictEqual('completed');
            break;
          }
          default: {
            break;
          }
        }
      },
    });

    await task1.start(job);
  });
});
