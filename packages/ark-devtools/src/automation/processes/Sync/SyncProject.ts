import { createProcess } from '../../core/Automator';
import glob from 'tiny-glob';

export default () =>
  createProcess((automator) => {
    automator.title = 'Sync Process';
    automator.step(
      function* () {
        yield glob('**/*.manifest.{yml,yaml}', {
          filesOnly: true,
          cwd: automator.cwd,
        });
      },
      { title: 'Scanning manifest files' }
    );
  });
