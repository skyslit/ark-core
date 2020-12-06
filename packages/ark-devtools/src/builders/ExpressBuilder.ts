import {Configuration} from 'webpack';
import {BuilderBase, ConfigurationOptions} from '../utils/BuilderBase';
import path from 'path';

/**
 * Express Builder
 */
export class ExpressBuilder extends BuilderBase {
  /**
   * @param {ConfigurationOptions} opts
   * @return {Configuration}
   */
  getConfiguration({cwd}: ConfigurationOptions): Configuration {
    return {
      mode: 'development',
      resolve: {
        extensions: [
          '.json',
          '.ts',
          '.tsx',
          '.css',
          '.scss',
        ],
      },
      entry: './src/app.server.ts',
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
                    __dirname, '../../node_modules', 'babel-loader'
                ),
              },
            ],
          },
        ],
      },
    };
  }
};
