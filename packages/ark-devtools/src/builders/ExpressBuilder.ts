import {Configuration, IgnorePlugin} from 'webpack';
import nodeExternals from 'webpack-node-externals';
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
        ],
      },
      entry: this.entryFilePath,
      output: {
        filename: 'main.js',
        path: path.resolve(cwd, 'build', 'server'),
      },
      target: 'node',
      externals: [nodeExternals()],
      plugins: [
        new IgnorePlugin({
          resourceRegExp: /s?css/gm,
        }),
      ],
      module: {
        rules: [
          {
            test: /\.(ts|tsx|js|jsx)$/,
            use: [
              {
                loader: path.resolve(
                    __dirname, '../../node_modules', 'babel-loader'
                ),
                options: {
                  compact: false,
                },
              },
            ],
          },
        ],
      },
    };
  }
};
