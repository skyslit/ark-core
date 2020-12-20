import {
  createService,
  createProcess,
} from './Automator';

const rocketsLaunched: string[] = [];

const isro = createService(() => {
  return {
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
});

describe('automator real-world usage', () => {
  test('async order of execution check', (done) => {
    const task = createProcess((automator) => {
      automator.run(isro(function* ({launchRocket, launchRocketSlow}) {
        yield launchRocket('SLV');
        yield launchRocketSlow('ASLV');
        yield launchRocket('GSLV Mk III.');
      }));

      automator.run(isro(function* ({launchRocket, launchRocketSlow}) {
        yield launchRocketSlow('PSLV.');
        yield launchRocket('RLV-TD.');
        yield launchRocket('Scramjet Engine - TD.');
      }));
    });
    task.start()
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
});
