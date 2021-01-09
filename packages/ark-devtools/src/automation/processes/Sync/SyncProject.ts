import { createProcess } from '../../core/Automator';
import glob from 'tiny-glob';

export default createProcess((automator) => {
  automator.run(function* () {
    const files = yield glob('**/*.manifest.{yml,yaml}', {
      filesOnly: true,
      cwd: automator.cwd,
    });
    console.log(files);
  });
});
