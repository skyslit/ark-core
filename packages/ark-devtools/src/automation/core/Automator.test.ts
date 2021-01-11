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
