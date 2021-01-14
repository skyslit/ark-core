import { createProcess } from '../../core/Automator';

const delay = (ms: number) =>
  new Promise((resolve, reject) => setTimeout(resolve, ms));

export default () =>
  createProcess((automator) => {
    new Array(3).fill(null).forEach((_, index) => {
      // Initialise npm package
      automator.step(function* () {
        yield delay(2000);
        automator.job.queueAutomator(
          createProcess((automator) => {
            automator.step(function* () {
              yield delay(500);
            });
          })
        );
      });
    });
  });
