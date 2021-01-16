import { createProcess } from '../../core/Automator';
import { useFileSystem } from '../../services/FileIO';
import { ManifestManager, ManifestUtils } from '../../../utils/ManifestManager';

export default () =>
  createProcess((automator) => {
    const { useFile } = useFileSystem(automator);
    let packageName: any = null;

    // Initialise npm package
    automator.step(function* () {
      // Run npm init
      yield automator.runOnCli('npm', ['init', '-y']);
      yield useFile('package.json')
        .readFromDisk()
        .parse('json')
        .act(function* (opts) {
          packageName = yield automator.prompt({
            key: 'package-name',
            question: 'Project name',
            type: 'text-input',
          });

          opts.content.name = packageName;
          opts.saveFile();
        });
    });

    // Initialise directory
    automator.step(function* () {
      const manager: ManifestManager = new ManifestManager(
        automator.cwd,
        ManifestUtils.createManifest({ name: packageName })
      );

      yield manager.write();
    });
  });
