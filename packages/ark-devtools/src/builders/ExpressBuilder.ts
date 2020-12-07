import {Configuration} from 'webpack';
import {BuilderBase, ConfigurationOptions} from '../utils/BuilderBase';
import path from 'path';

/**
 * Express Builder
 */
export class ExpressBuilder extends BuilderBase {
  private entryFilePath: string;
  /**
   * Creates a new express builder instance
   * @param {string} entryFilePath
   */
  constructor(entryFilePath: string) {
    super();
    this.entryFilePath = entryFilePath;
  }
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
      entry: this.entryFilePath,
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
