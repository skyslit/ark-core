import { createPlugin } from '../utils/ManifestManager';
import { useFileSystem } from '../automation/services/FileIO';
import { openPackageJson } from '../automation/helpers/package_json';
// import platformVersionManager from '../utils/PlatformVersionManager';

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

        opts.registerAction('INSTALL_TYPESCRIPT', function* (opts) {
          yield opts.automator.runOnCli('npm', ['install', 'typescript']);
        });

        opts.evaluate(function* (opts) {
          const { existFile, useFile } = useFileSystem(opts.automator);
          if (!existFile('package.json')) {
            opts.task.push('NPM_INIT');
            opts.task.push('UPDATE_PACKAGE_JSON', { name: opts.data });
          }

          yield useFile('package.json')
            .readFromDisk()
            .parse('json')
            .act(function* (fileOpts) {
              const editor = openPackageJson(fileOpts);
              if (!editor.hasDependency('typescript')) {
                opts.task.push('INSTALL_TYPESCRIPT');
              }
            });
        });
      },
      true
    ),
};
