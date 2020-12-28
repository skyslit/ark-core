import {createProcess} from '../../core/Automator';
import FileIO from '../../services/FileIO';

export default createProcess((automator) => {
  automator.run(function* () {
    yield FileIO.createDirectory(automator.resolvePath('./test'));
  });
});
