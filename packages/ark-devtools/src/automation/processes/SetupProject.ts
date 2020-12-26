import {createProcess} from '../core/Automator';
import fileIO from '../services/FileIO';

export default createProcess((automator) => {
  automator.run(fileIO(function* ({
  }) {
    yield (() => new Promise((r) => {
      setTimeout(() => {
        console.log('dishu 1');
        r(null);
      }, 3000);
    }))();
    console.log('dishu');
  }));
});
