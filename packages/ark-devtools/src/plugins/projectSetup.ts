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
        /**
         * Initialize node package
         */
        opts.registerAction('NPM_INIT', function* (opts) {
          yield opts.automator.runOnCli('npm', ['init', '--y']);
        });

        /**
         * Update package.json with name
         */
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

        /**
         * Install typescript
         */
        opts.registerAction('INSTALL_TYPESCRIPT', function* (opts) {
          yield opts.automator.runOnCli('npm', ['install', 'typescript']);
        });

        /**
         * configure typescript
         */
        opts.registerAction('INIT_TYPESCRIPT', function* (opts) {
          const { useFile } = useFileSystem(opts.automator);
          yield opts.automator.runOnCli('node', [
            './node_modules/.bin/tsc',
            '--init',
          ]);

          yield useFile('tsconfig.json')
            .readFromDisk()
            .parse('json')
            .act(function* (fileOpts) {
              fileOpts.content.compilerOptions.jsx = 'react';
              fileOpts.saveFile();
            });
        });

        opts.evaluate(function* (opts) {
          const { existFile, useFile } = useFileSystem(opts.automator);
          if (!existFile('package.json')) {
            opts.task.push(
              'NPM_INIT',
              {},
              {
                title: 'initialize npm package',
              }
            );
            opts.task.push(
              'UPDATE_PACKAGE_JSON',
              { name: opts.data },
              {
                title: 'update package.json',
              }
            );
          }

          yield useFile('package.json')
            .readFromDisk()
            .parse('json')
            .act(function* (fileOpts) {
              const editor = openPackageJson(fileOpts);
              if (!editor.hasDependency('typescript')) {
                opts.task.push('INSTALL_TYPESCRIPT', null, {
                  title: 'install typescript',
                });
              }
            });

          if (!existFile('tsconfig.json')) {
            opts.task.push('INIT_TYPESCRIPT', null, {
              title: 'configuring typescript',
            });
          }
        });
      },
      true
    ),
};
