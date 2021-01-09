import { createProcess } from '../../core/Automator';
import { useFileSystem } from '../../services/FileIO';
import { ManifestManager, ManifestUtils } from '../../../utils/ManifestManager';

export default () =>
  createProcess((automator) => {
    const { useFile } = useFileSystem(automator);

    // Initialise npm package
    automator.run(function* () {
      // Run npm init
      yield automator.runOnCli('npm', ['init', '-y']);
      yield useFile('package.json')
        .readFromDisk()
        .parse('json')
        .act(function* (content, raw, saveFile) {
          const packageName = yield automator.prompt({
            key: 'package-name',
            question: 'Project name',
            type: 'text-input',
          });

          content.name = packageName;
          saveFile();
        });
    });

    // Initialise directory
    automator.run(function* () {
      const manager: ManifestManager = new ManifestManager(
        automator.cwd,
        ManifestUtils.createManifest({})
      );

      yield manager.write();
    });
  });
