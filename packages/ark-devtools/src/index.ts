/* eslint-disable require-jsdoc */
/* eslint-disable no-unused-vars */
import path from 'path';
import chalk from 'chalk';
import {spawnSync} from 'child_process';
import {BuilderBase, ConfigurationOptions} from './utils/BuilderBase';
import {Configuration} from 'webpack';

// spawnSync('node', [path.join(__dirname, './scripts/build.js')], {
//   stdio: 'inherit',
// });

class SampleBuilder extends BuilderBase {
  private entryPathname: string;
  constructor(entryPath: string) {
    super();
    this.entryPathname = entryPath;
  }

  getConfiguration({cwd, mode}: ConfigurationOptions): Configuration {
    return {
      mode,
      entry: this.entryPathname,
      output: {
        filename: 'main.js',
        path: path.resolve(cwd, 'build', 'server'),
      },
      module: {
        rules: [
          {
            test: /\.(ts|tsx|js|jsx)$/,
            use: [
              {
                loader: path.resolve(
                    __dirname, '../node_modules', 'babel-loader'
                ),
              },
            ],
          },
        ],
      },
    };
  }
};

const builder = new SampleBuilder(
    path.join(process.cwd(), 'src', 'app.server.ts')
);

builder.on('error', (err) => {
  console.error(chalk.red(err));
});

builder.on('warning', (w) => {
  console.error(chalk.yellow(w));
});

builder.build({
  cwd: process.cwd(),
  mode: 'production',
});
