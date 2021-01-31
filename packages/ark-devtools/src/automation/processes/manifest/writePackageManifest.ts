import { createProcess } from '../../core/Automator';
import { ManifestManager, ManifestUtils } from '../../../utils/ManifestManager';

export default () =>
  createProcess((automator) => {
    automator.title = 'Creating new project in this directory';

    let packageName: any = null;

    // Initialise directory
    automator.step(
      function* () {
        packageName = yield automator.prompt({
          key: 'package-name',
          question: 'Project name',
          type: 'text-input',
        });

        const manager: ManifestManager = new ManifestManager(
          automator.cwd,
          ManifestUtils.createManifest({ name: packageName })
        );

        yield manager.write();
      },
      {
        title: 'writing project manifest',
      }
    );
  });
