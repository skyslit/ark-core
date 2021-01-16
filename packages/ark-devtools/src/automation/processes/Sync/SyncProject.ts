import { createProcess } from '../../core/Automator';
import glob from 'tiny-glob';
import {
  ManifestController,
  ManifestManager,
} from '../../../utils/ManifestManager';
import path from 'path';

export default (controller?: ManifestController) =>
  createProcess((automator) => {
    automator.title = 'Sync Process';
    automator.step(
      function* () {
        const actionSearch = automator.createObserver(
          'searching the directory...'
        );

        const files: string[] = yield glob('**/*.manifest.{yml,yaml}', {
          filesOnly: true,
          cwd: automator.cwd,
        });
        actionSearch.updateStatus('completed');
        let i: number = 0;
        for (i = 0; i < files.length; i++) {
          automator.cwd = path.dirname(path.join(automator.cwd, files[i]));
          const targetManifest = new ManifestManager(automator.cwd);
          if (targetManifest.load('auto', true)) {
            yield () => targetManifest.sync(automator, controller);
          }
        }
        automator
          .getData('MAN_PLUGIN:AUTOMATOR_QUEUE', [])
          .forEach((innerAutomator) => {
            automator.job.queueAutomator(innerAutomator);
          });
      },
      { title: 'Scanning manifest files' }
    );
  });
