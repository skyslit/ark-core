import {
  createProcess,
  Job,
  TestMonitor,
} from './Automator';

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
  beforeEach(() => rocketsLaunched = []);

  test('async order of execution check', (done) => {
    const task = createProcess((automator) => {
      automator.run(function* () {
        yield isro.launchRocket('SLV');
        yield isro.launchRocketSlow('ASLV');
        yield isro.launchRocket('GSLV Mk III.');
      });

      automator.run(function* () {
        yield isro.launchRocketSlow('PSLV.');
        yield isro.launchRocket('RLV-TD.');
        yield isro.launchRocket('Scramjet Engine - TD.');
      });
    });
    task.start(new Job())
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
      automator.run(function* () {
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

      automator.run(function* () {
        yield isro.launchRocketSlow('PSLV.');
        yield isro.launchRocket('RLV-TD.');
        yield isro.launchRocket('Scramjet Engine - TD.');
      });
    });
    task.start(new Job(new TestMonitor({
      'sample-input': 'Sounding Rockets',
    })))
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
});
