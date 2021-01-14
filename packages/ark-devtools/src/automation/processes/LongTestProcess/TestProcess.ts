import { createProcess } from '../../core/Automator';

const delay = (ms: number) =>
  new Promise((resolve, reject) => setTimeout(resolve, ms));

export default () =>
  createProcess((automator) => {
    let counter: number = 0;
    new Array(3).fill(null).forEach((_, index) => {
      // Initialise npm package
      automator.step(function* () {
        counter++;

        if (counter === 2) {
          throw new Error('File permission denied (intentional)');
        }

        yield delay(1000);
        automator.job.queueAutomator(
          createProcess((automator) => {
            automator.step(function* () {
              counter++;
              yield delay(100);
            });
          })
        );
      });
    });
  });
