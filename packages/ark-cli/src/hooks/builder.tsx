import { useCallback } from 'react';
import glob from 'tiny-glob';
import path from 'path';
import stripIndent from 'strip-indent';
import chalk from 'chalk';
import { BackendBuilder, SPABuilder } from '@skyslit/ark-devtools';

type Options = {
  cwd: string;
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
    // let errors: string[] = [];
    // let warnings: string[] = [];

    const updateSnapshot = () => {
      console.clear();
      console.log(
        stripIndent(`
        ${chalk.green('Compiled successfully')}
      `).trim()
      );
    };

    const buildFrontend = (
      clientEntryFilePaths: string[],
      serverEntryFilePaths: string[]
    ) => {
      clientEntryFilePaths.forEach((entryFilePath) => {
        const builder = new SPABuilder(
          'admin',
          path.join(opts.cwd, entryFilePath)
        );
        builder.attachMonitor((err, result) => {
          if (!err) {
            buildBackend(serverEntryFilePaths);
          } else {
            console.log(err, result);
          }
          // Update snapshot
          updateSnapshot();
        });
        builder.build({
          cwd: opts.cwd,
          mode,
          watchMode: mode === 'development',
        });
      });
    };

    const buildBackend = (entryFilePaths: string[]) => {
      entryFilePaths.forEach((entryFilePath) => {
        const builder = new BackendBuilder(path.join(opts.cwd, entryFilePath));
        builder.attachMonitor((err, result) => {
          if (!err) {
          } else {
            console.log(err, result);
          }
          // Update snapshot
          updateSnapshot();
        });
        builder.build({
          cwd: opts.cwd,
          mode,
          watchMode: mode === 'development',
        });
      });
    };

    const clientEntries = await glob('src/*.client.tsx', { cwd: opts.cwd });
    const serverEntries = await glob('src/*.server.ts', { cwd: opts.cwd });

    console.clear();
    console.log(chalk.blueBright('Starting compilation...'));
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
