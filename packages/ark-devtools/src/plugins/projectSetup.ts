import { createPlugin } from '../utils/ManifestManager';
import { useFileSystem } from '../automation/services/FileIO';
import { openPackageJson } from '../automation/helpers/package_json';
import gitP, { SimpleGit } from 'simple-git/promise';
import ejs from 'ejs';
import path from 'path';
import fs from 'fs';

export default {
  setupMainService: () =>
    createPlugin(
      'package',
      /^serviceId$/,
      (opts) => {
        opts.evaluate(function* (opts) {
          const { useFile } = useFileSystem(opts.automator);
          yield useFile(`src/server/${opts.data}.server.ts`)
            .readFromDisk()
            .parse('raw')
            .act(function* (fileOpts) {
              if (!fileOpts.exists) {
                fileOpts.content = ejs.render(
                  fs.readFileSync(
                    path.join(
                      __dirname,
                      '../../assets/Backend/entry.template.ejs'
                    ),
                    'utf-8'
                  ),
                  {}
                );
                fileOpts.saveFile();
              }
            });
        });
      },
      true
    ),
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
          yield opts.automator.runOnCli('npm', [
            'install',
            'typescript',
            '--save-dev',
          ]);
        });

        /**
         * Install deps
         */
        opts.registerAction('INSTALL_DEP', function* (opts) {
          yield opts.automator.runOnCli('npm', ['install', ...opts.args.deps]);
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

        opts.registerAction('SETUP_GIT', function* (opts) {
          const git: SimpleGit = gitP(opts.automator.cwd);

          // Initialise repository
          yield git.init();
        });

        // Evaluation
        opts.evaluate(function* (opts) {
          const git: SimpleGit = gitP(opts.automator.cwd);

          const { existFile, useFile } = useFileSystem(opts.automator);

          // Initialize npm package
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

          // Install dependencies
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

          // Configure dependencies
          if (!existFile('tsconfig.json')) {
            opts.task.push('INIT_TYPESCRIPT', null, {
              title: 'configuring typescript',
            });
          }

          // Touch .gitignore
          yield useFile('.gitignore')
            .readFromDisk()
            .parse('raw-lines')
            .act(function* (fileOpts) {
              const content: string[] = fileOpts.content;

              const addEntry = (entry: string) => {
                const exists =
                  content.filter(
                    (e) => e.toLowerCase().indexOf(entry.toLowerCase()) > -1
                  ).length > 0;

                if (exists === false) {
                  content.push(entry);
                }
              };

              // Dependencies
              addEntry('node_modules');

              // Test
              addEntry('coverage');

              // Logs
              addEntry('logs');
              addEntry('*.log');
              addEntry('npm-debug.log*');
              addEntry('yarn-debug.log*');
              addEntry('yarn-error.log*');
              addEntry('lerna-debug.log*');

              // Cache
              addEntry('.npm');
              addEntry('.eslintcache');

              // Build
              addEntry('build');

              // Utils
              addEntry('.DS_Store');

              fileOpts.saveFile();
            });

          // Check linter
          yield useFile('.eslintrc.json')
            .readFromDisk()
            .parse('json')
            .act(function* (fileOpts) {
              if (!fileOpts.exists) {
                fileOpts.content.root = true;
                fileOpts.content.parser = '@typescript-eslint/parser';
                fileOpts.content.plugins = ['@typescript-eslint'];
                fileOpts.content.extends = [
                  'google',
                  'prettier',
                  'prettier/@typescript-eslint',
                  'prettier/react',
                ];

                opts.task.push(
                  'INSTALL_DEP',
                  {
                    deps: [
                      '@typescript-eslint/eslint-plugin@^4.8.2',
                      '@typescript-eslint/parser@^4.8.2',
                      'eslint@7.14.0',
                      'eslint-config-google@^0.14.0',
                      'eslint-config-prettier@^7.1.0',
                      '--save-dev',
                    ],
                  },
                  {
                    title: 'installing eslint, plugins and presets...',
                  }
                );

                fileOpts.saveFile();
              }
            });

          yield useFile('.eslintignore')
            .readFromDisk()
            .parse('raw-lines')
            .act(function* (fileOpts) {
              const content: string[] = fileOpts.content;

              const addEntry = (entry: string) => {
                const exists =
                  content.filter(
                    (e) => e.toLowerCase().indexOf(entry.toLowerCase()) > -1
                  ).length > 0;

                if (exists === false) {
                  content.push(entry);
                }
              };

              addEntry('build');
              addEntry('node_modules');
              addEntry('coverage');

              fileOpts.saveFile();
            });

          // Add prettier
          yield useFile('.prettierignore')
            .readFromDisk()
            .parse('raw-lines')
            .act(function* (fileOpts) {
              const content: string[] = fileOpts.content;

              const addEntry = (entry: string) => {
                const exists =
                  content.filter(
                    (e) => e.toLowerCase().indexOf(entry.toLowerCase()) > -1
                  ).length > 0;

                if (exists === false) {
                  content.push(entry);
                }
              };

              addEntry('build');
              addEntry('node_modules');
              addEntry('coverage');

              fileOpts.saveFile();
            });

          // Install prettier
          yield useFile('.prettierrc.json')
            .readFromDisk()
            .parse('json')
            .act(function* (fileOpts) {
              if (!fileOpts.exists) {
                fileOpts.content.singleQuote = true;

                opts.task.push(
                  'INSTALL_DEP',
                  {
                    deps: ['prettier', '--save-dev', '--save-exact'],
                  },
                  {
                    title: 'installing prettier',
                  }
                );

                opts.task.push(
                  'INSTALL_DEP',
                  {
                    deps: ['pretty-quick', 'husky', '--save-dev'],
                  },
                  {
                    title: 'installing husky',
                  }
                );

                fileOpts.saveFile();
              }
            });

          // Configure prettier hook
          yield useFile('package.json')
            .readFromDisk()
            .parse('json')
            .act(function* (fileOpts) {
              const content: any = fileOpts.content;
              if (content) {
                if (!content.husky) {
                  content.husky = {};
                }

                if (!content.husky.hooks) {
                  content.husky.hooks = {};
                }

                if (!content.husky.hooks['pre-commit']) {
                  content.husky.hooks['pre-commit'] = 'pretty-quick --staged';
                  fileOpts.saveFile();
                }
              }
            });

          // Install core peer dependencies
          yield useFile('package.json')
            .readFromDisk()
            .parse('json')
            .act(function* (fileOpts) {
              const editor = openPackageJson(fileOpts);
              const args: string[] = [];

              const depMap: { [key: string]: string } = {
                // Backend
                express: '^4.17.1',
                joi: '17.3.0',
                mongoose: '^5.10.15',
                react: '^16.0.1',
                'react-dom': '^16.0.1',
                'react-helmet-async': '^1.0.7',
                'react-router-dom': '5.2.0',

                // Frontend
                axios: '^0.21.1',
              };

              Object.keys(depMap).forEach((key) => {
                if (!editor.hasDependency(key)) {
                  args.push(`${key}@${depMap[key]}`);
                }
              });

              if (args.length > 0) {
                opts.task.push(
                  'INSTALL_DEP',
                  {
                    deps: [...args],
                  },
                  {
                    title: 'installing core dependencies',
                  }
                );
              }
            });

          // Install Ark
          yield useFile('package.json')
            .readFromDisk()
            .parse('json')
            .act(function* (fileOpts) {
              const editor = openPackageJson(fileOpts);
              const args: string[] = [];

              if (!editor.hasDependency('@skyslit/ark-core')) {
                args.push('@skyslit/ark-core@^2.0.0');
              }

              if (!editor.hasDependency('@skyslit/ark-backend')) {
                args.push('@skyslit/ark-backend@^2.0.0');
              }

              if (!editor.hasDependency('@skyslit/ark-frontend')) {
                args.push('@skyslit/ark-frontend@^2.0.0');
              }

              if (!editor.hasDependency('fpz')) {
                args.push('fpz@^2.0.0');
              }

              if (args.length > 0) {
                opts.task.push(
                  'INSTALL_DEP',
                  {
                    deps: [...args],
                  },
                  {
                    title: 'installing ark',
                  }
                );
              }
            });

          // Add npm scripts
          yield useFile('package.json')
            .readFromDisk()
            .parse('json')
            .act(function* (fileOpts) {
              if (!fileOpts.content.scripts) {
                fileOpts.content.scripts = {};
              }

              if (!fileOpts.content.scripts.start) {
                fileOpts.content.scripts.start = 'ark start';
                fileOpts.saveFile();
              }
            });

          // Add git setup to the queue
          yield () =>
            new Promise((resolve) => {
              git
                .status()
                .then((stat) => {
                  resolve(stat);
                })
                .catch((err) => {
                  if (/not a git/.test(err.message)) {
                    opts.task.push('SETUP_GIT', null, {
                      title: 'setting up a repository',
                    });
                  }
                  resolve(false);
                });
            });
        });
      },
      true
    ),
};
