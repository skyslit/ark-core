import {Configuration} from 'webpack';
import {BuilderBase, ConfigurationOptions} from '../utils/BuilderBase';
import path from 'path';

/**
 * SPA Builder
 */
export class SPABuilder extends BuilderBase {
  private entryFilePath: string;
  private appId: string;
  /**
   * Creates a new SPA builder instance
   * @param {string} id
   * @param {string} entryFilePath
   */
  constructor(id: string, entryFilePath: string) {
    super();
    this.appId = id;
    this.entryFilePath = entryFilePath;

    if (!this.appId) {
      throw new Error('App ID should not be null');
    }
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
          '.js',
          '.jsx',
        ],
      },
      entry: this.entryFilePath,
      output: {
        filename: `${this.appId}.js`,
        path: path.resolve(cwd, 'build'),
        assetModuleFilename: './assets/[hash][ext][query]',
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
          {
            test: /\.(png|svg|jpg|jpeg|gif)$/i,
            type: 'asset/resource',
          },
        ],
      },
    };
  }
};
