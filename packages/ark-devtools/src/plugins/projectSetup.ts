import { createPlugin } from '../utils/ManifestManager';
import { useFileSystem } from '../automation/services/FileIO';

export default {
  setup: () =>
    createPlugin(
      'package',
      /^name$/,
      (opts) => {
        opts.registerAction('NPM_INIT', function* (opts) {
          yield opts.automator.runOnCli('npm', ['init', '--y']);
        });

        opts.registerAction('UPDATE_PACKAGE_JSON', function* (opts) {
          const { useFile } = useFileSystem(opts.automator);
          yield useFile('package.json')
            .readFromDisk()
            .parse('json')
            .act(function* (innerOpts) {
              innerOpts.content.name = opts.args.name;
              innerOpts.saveFile();
            });
        });

        opts.registerAction('INSTALL_DEPENDENCIES', function* () {});

        opts.evaluate(function* (opts) {
          const { existFile } = useFileSystem(opts.automator);
          if (!existFile('package.json')) {
            yield opts.task.push('NPM_INIT');
            yield opts.task.push('UPDATE_PACKAGE_JSON', { name: opts.data });
          }
        });
      },
      true
    ),
};
