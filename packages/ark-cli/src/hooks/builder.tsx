import { useCallback } from 'react';
import glob from 'tiny-glob';
import path from 'path';
import stripIndent from 'strip-indent';
import chalk from 'chalk';
import { BackendBuilder, SPABuilder } from '@skyslit/ark-devtools';
import { spawn, ChildProcess } from 'child_process';
import fs from 'fs';
import rimraf from 'rimraf';

const clear = require('console-clear');

type Options = {
  cwd: string;
};

type BuilderSnapshotItem = {
  errors: any[];
  warnings: any[];
};

type BuilderSnapshot = {
  [key: string]: BuilderSnapshotItem;
};

export const useBuilder = (opts: Options) => {
  // Normalise
  opts = Object.assign<Options, Partial<Options>>(
    {
      cwd: process.cwd(),
    },
    opts || {}
  );

  const build = useCallback(async (mode: 'development' | 'production') => {
    const state: BuilderSnapshot = {};
    let backendRunning: boolean = false;
    let frontendRunning: boolean = false;

    const updateSnapshot = (key: string, item: BuilderSnapshotItem) => {
      state[key] = item;
    };

    const isInteractive: boolean = mode === 'development';

    /**
     * Clears console
     */
    const clearConsole = () => {
      if (isInteractive === true) {
        clear();
      }
    };

    const renderSnapshot = () => {
      clearConsole();
      let hasErrors: boolean = false;
      let hasWarnings: boolean = false;
      let error: any = null;
      let warnings: any[] = [];

      Object.keys(state).forEach((k) => {
        if (hasErrors === false) {
          if (state[k].errors.length > 0) {
            hasErrors = true;
            if (!error) {
              error = state[k].errors[0];
            }
          }
        }

        if (hasWarnings === false) {
          if (state[k].warnings.length > 0) {
            hasWarnings = true;
          }
        }

        if (state[k].warnings.length > 0) {
          warnings = state[k].warnings;
        }
      });

      const renderTargets = () => {
        console.log(
          chalk.gray(
            `Targets: ${[
              ...serverEntries.map((e) => `${path.basename(e)} (express)`),
              ...clientEntries.map((e) => `${path.basename(e)} (client)`),
            ].join(', ')}`
          )
        );
      };

      if (hasErrors) {
        console.log(
          stripIndent(`
          ${chalk.red('Failed to compile.')}
        `).trim()
        );
        console.log('');
        renderTargets();
        console.log('');
        console.log(error);
      } else if (hasWarnings) {
        console.log(
          stripIndent(`
          ${chalk.yellow('Compiled with warnings')}
        `).trim()
        );
        console.log('');
        renderTargets();
        console.log('');
        console.log(warnings.join('\n'));
      } else {
        console.log(
          stripIndent(`
          ${chalk.green('Compiled successfully')}
        `).trim()
        );
        console.log('');
        renderTargets();
      }
    };

    let appProcess: ChildProcess = null;

    const targetBuildDir = path.join(opts.cwd, 'build');
    const cleanBuildDir = () => {
      if (fs.existsSync(targetBuildDir)) {
        rimraf.sync(targetBuildDir);
      }
    };

    const runApp = () => {
      if (mode === 'development') {
        if (appProcess) {
          appProcess.kill('SIGTERM');
        }
        const appPath: string = path.join(
          opts.cwd,
          'build',
          'server',
          'main.js'
        );
        if (!fs.existsSync(appPath)) {
          console.log('');
          console.log(chalk.yellow('Waiting for output...'));
          return false;
        }
        appProcess = spawn('node', [appPath], {
          stdio: 'inherit',
        });
      }
    };

    const buildBackend = (entryFilePaths: string[]) => {
      if (backendRunning === true) {
        return;
      }
      backendRunning = true;
      entryFilePaths.forEach((entryFilePath, index) => {
        const builder = new BackendBuilder(path.join(opts.cwd, entryFilePath));
        builder.attachMonitor((err, result) => {
          if (!err) {
            updateSnapshot(`server-${index}`, {
              errors: result.compilation.errors,
              warnings: result.compilation.warnings,
            });

            renderSnapshot();
            runApp();
          } else {
            console.log(err);
          }
        });
        builder.build({
          cwd: opts.cwd,
          mode,
          watchMode: mode === 'development',
        });
      });
    };

    const buildFrontend = (
      clientEntryFilePaths: string[],
      serverEntryFilePaths: string[]
    ) => {
      if (frontendRunning === true) {
        return;
      }
      frontendRunning = true;
      clientEntryFilePaths.forEach((entryFilePath, index) => {
        const builder = new SPABuilder(
          path.basename(entryFilePath).split('.')[0],
          path.join(opts.cwd, entryFilePath)
        );
        builder.attachMonitor((err, result) => {
          if (!err) {
            updateSnapshot(`client-${index}`, {
              errors: result.compilation.errors,
              warnings: result.compilation.warnings,
            });

            renderSnapshot();
            runApp();

            buildBackend(serverEntryFilePaths);
          } else {
            console.log(err);
          }
        });
        builder.build({
          cwd: opts.cwd,
          mode,
          watchMode: mode === 'development',
        });
      });
    };

    const clientEntries = await glob('src/*.client.tsx', { cwd: opts.cwd });
    const serverEntries = await glob('src/server/main.server.ts', {
      cwd: opts.cwd,
    });

    clearConsole();
    if (mode === 'development') {
      console.log(chalk.blueBright('Starting compilation...'));
    } else {
      console.log('Creating production build...');
    }
    cleanBuildDir();
    if (serverEntries.length > 0) {
      if (clientEntries.length > 0) {
        buildFrontend(clientEntries, serverEntries);
      } else {
        buildBackend(serverEntries);
      }
    } else {
      console.log('0 server build target(s) found');
      process.exit(0);
    }
  }, []);

  return {
    build,
  };
};
