import Listr from 'listr';
import inquirer from 'inquirer';
import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { Observable } from 'rxjs';
import gitP from 'simple-git/promise';
import runCommand from '../utils/run-command';
import ensureDir from '../utils/ensure-dir';
import ejs from 'ejs';

export default (cwd_?: string) => {
  const packager: 'npm' | 'yarn' = 'npm';
  const cwd = cwd_ || process.cwd();
  const git = gitP(cwd);
  const job = new Listr([
    {
      title: 'initialize npm package',
      task: (ctx: any, task: any) => {
        return new Observable((observer) => {
          const { cwd } = ctx;

          // Check if package.json exists
          const packageJsonPath = path.join(cwd, 'package.json');
          const doesPackageJsonFileExists = fs.existsSync(packageJsonPath);

          if (doesPackageJsonFileExists === true) {
            task.skip('Package already initialized');
            observer.complete();
          } else {
            const packageName: string = ctx.projectName;

            // @ts-ignore
            ctx.projectType = {
              'full-stack application': 'solution',
              'freepizza module': 'module',
            }[ctx.projectType];

            if (!packageName) {
              throw new Error(`Project name is required`);
            }

            fs.writeFileSync(
              packageJsonPath,
              JSON.stringify(
                {
                  name: packageName,
                  description: 'Cloud Application powered by Skyslit Ark',
                  version: '0.0.1',
                  scripts: {
                    start: 'fpz start',
                    build: 'fpz build',
                    lint: 'eslint .',
                    test: 'echo "Error: no test specified" && exit 1',
                  },
                  license: 'ISC',
                  dependencies: {},
                  devDependencies: {},
                  husky: {
                    hooks: {
                      'pre-commit': 'pretty-quick --staged',
                    },
                  },
                  fpz: {
                    type: ctx.projectType,
                  },
                },
                undefined,
                ' '
              )
            );
            observer.complete();
          }
        });
      },
    },
    {
      title: 'add .gitignore',
      task: (ctx: any, task: any) => {
        return new Observable((observer) => {
          const { cwd } = ctx;

          // Check if .gitignore exists
          const filePath = path.join(cwd, '.gitignore');
          const doesFileExists = fs.existsSync(filePath);

          if (doesFileExists === true) {
            task.skip('.gitignore already exists');
            observer.complete();
          } else {
            fs.writeFileSync(
              filePath,
              [
                '# Dependencies',
                'node_modules',
                '',
                '# Test',
                'coverage',
                '',
                '# Logs',
                'logs',
                '*.log',
                'npm-debug.log*',
                'yarn-debug.log*',
                'yarn-error.log*',
                'lerna-debug.log*',
                '',
                '# Cache',
                '.npm',
                '.eslintcach',
                '',
                '# Build',
                'build',
                '',
                '# Utils',
                '.DS_Store',
                '',
              ].join('\n')
            );
            observer.complete();
          }
        });
      },
    },
    {
      title: 'setup git',
      task: () => git.init().then(() => git.add('./*')),
    },
    {
      title: 'install and configure typescript',
      task: () =>
        runCommand(
          `using ${packager}...`,
          `${packager} install typescript@3.9.7; exit;`,
          {
            cwd,
          }
        ),
    },
    {
      title: 'install and configure git hook with prettier',
      task: () =>
        new Listr([
          {
            title: 'install prettier (exact)',
            task: () =>
              runCommand(
                `using ${packager}...`,
                `${packager} install prettier --save-dev --save-exact; exit;`,
                {
                  cwd,
                }
              ),
          },
          {
            title: 'install pretty-quick, husky',
            task: () =>
              runCommand(
                `using ${packager}...`,
                `${packager} install pretty-quick husky --save-dev; exit;`,
                {
                  cwd,
                }
              ),
          },
        ]),
    },
    {
      title: 'configure .eslint',
      task: (ctx: any, task: any) => {
        return new Listr([
          {
            title: 'install .eslintrc dependencies',
            task: () => {
              const deps = [
                'eslint@^7.14.0',
                'eslint-config-google@^0.14.0',
                'eslint-config-prettier@^7.2.0',
                '@typescript-eslint/parser@^4.14.1',
                '@typescript-eslint/eslint-plugin@^4.14.1',
              ];
              return runCommand(
                `using ${packager}...`,
                `${packager} install ${deps.join(' ')} --save-dev; exit;`,
                {
                  cwd,
                }
              );
            },
          },
          {
            title: 'write .eslintrc.json',
            task: () =>
              new Observable((observer) => {
                const { cwd } = ctx;

                // Check if .gitignore exists
                const filePath = path.join(cwd, '.eslintrc.json');
                const doesFileExists = fs.existsSync(filePath);

                if (doesFileExists === true) {
                  task.skip('.eslintrc.json already exists');
                  observer.complete();
                } else {
                  fs.writeFileSync(
                    filePath,
                    JSON.stringify(
                      {
                        root: true,
                        parser: '@typescript-eslint/parser',
                        plugins: ['@typescript-eslint'],
                        extends: [
                          'google',
                          'prettier',
                          'prettier/@typescript-eslint',
                          'prettier/react',
                        ],
                      },
                      null,
                      ' '
                    )
                  );
                  observer.complete();
                }
              }),
          },
        ]);
      },
    },
    {
      title: 'install dependencies',
      task: () => {
        const deps = [
          // Backend
          'express@^4.17.1',
          'joi@^17.3.0',
          'mongoose@^5.10.15',
          'react@^16.0.1',
          'react-dom@^16.0.1',
          'react-helmet-async@^1.0.7',
          'react-router-dom@^5.2.0',

          // Frontend
          'axios@^0.21.1',

          // Core
          '@skyslit/ark-core@^2.0.0',
          '@skyslit/ark-backend@^2.0.0',
          '@skyslit/ark-frontend@^2.0.0',
          'fpz@^2.0.0',
        ];
        return runCommand(
          `using ${packager}...`,
          `${packager} install ${deps.join(' ')} --save; exit;`,
          {
            cwd,
          }
        );
      },
    },
    {
      title: 'configure @types in packages',
      task: () =>
        new Listr([
          {
            title: 'install @types declarations',
            task: () => {
              const deps = [
                '@types/cookie-parser@^1.4.2',
                '@types/express@^4.17.9',
                '@types/mongoose@^5.10.0',
                '@types/react@^16.0.1',
                '@types/react-dom@^16.0.1',
                '@types/react-router-dom@^5.1.6',
              ];
              return runCommand(
                `using ${packager}...`,
                `${packager} install ${deps.join(' ')} --save-dev; exit;`,
                {
                  cwd,
                }
              );
            },
          },
          {
            title: 'create ark-env.d.ts with type reference',
            task: (ctx: any, task: any) => {
              return new Observable((observer) => {
                const { cwd } = ctx;

                // Check if ark-env.d.ts exists
                const filePath = path.join(cwd, 'src', 'ark-env.d.ts');

                ensureDir(filePath);

                const doesFileExists = fs.existsSync(filePath);

                if (doesFileExists === true) {
                  task.skip('ark-env.d.ts already exists');
                  observer.complete();
                } else {
                  fs.writeFileSync(
                    filePath,
                    [
                      '/* eslint-disable-next-line */',
                      '/// <reference types="fpz/typings" />',
                    ].join('\n')
                  );
                  observer.complete();
                }
              });
            },
          },
        ]),
    },
    {
      title: 'write main server application',
      task: (ctx: any, task: any) => {
        return new Observable((observer) => {
          const { cwd } = ctx;

          // Check if ark-env.d.ts exists
          const filePath = path.join(cwd, 'src', 'server', 'main.server.ts');

          ensureDir(filePath);

          const doesFileExists = fs.existsSync(filePath);

          if (doesFileExists === true) {
            task.skip('main.server.ts already exists');
            observer.complete();
          } else {
            const templatePath = path.join(
              __dirname,
              '../../assets/backend/main.server.ejs'
            );

            fs.writeFileSync(
              filePath,
              ejs.render(fs.readFileSync(templatePath, 'utf-8'), {})
            );
            observer.complete();
          }
        });
      },
    },
    {
      title: 'commit changes',
      task: () =>
        git.add('./*').then(() => git.commit('chore: initial commit')),
    },
  ]);

  if (fs.existsSync(path.join(cwd, 'package.json')) === true) {
    console.log(
      chalk.redBright('This directory already initialized with a package')
    );
    return Promise.resolve();
  }

  return Promise.resolve()
    .then(() =>
      inquirer.prompt([
        {
          name: 'projectName',
          message: 'Name of this project?',
          type: 'input',
        },
        {
          name: 'projectType',
          message: 'Choose project type',
          type: 'list',
          choices: ['full-stack application', 'freepizza module'],
          default: 0,
        },
      ])
    )
    .then((input) =>
      job.run({
        cwd,
        ...input,
      })
    );
};
