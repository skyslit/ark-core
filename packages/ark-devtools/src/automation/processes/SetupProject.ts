import {createProcess} from '../core/Automator';
import fileIO from '../services/FileIO';

export default createProcess((automator) => {
  automator.run(fileIO(function* ({
    sayHello,
  }) {
    yield sayHello();
  }));
});
