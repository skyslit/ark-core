import {Configuration} from 'webpack';
import {BuilderBase, ConfigurationOptions} from '../utils/BuilderBase';
import path from 'path';
import HTMLWebpackPlugin from 'html-webpack-plugin';

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
        alias: {
          ...this.mapPeerDependencies([
            'react',
            'react-dom',
            'react-router-dom',
          ], cwd),
        },
      },
      entry: this.entryFilePath,
      output: {
        filename: `${this.appId}.js`,
        path: path.resolve(cwd, 'build'),
        assetModuleFilename: './assets/[hash][ext][query]',
      },
      plugins: [
        new HTMLWebpackPlugin({
          filename: `${this.appId}.html`,
          template: path.resolve(__dirname, './assets/index.template.html'),
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
          {
            test: /\.(png|svg|jpg|jpeg|gif)$/i,
            type: 'asset/resource',
          },
        ],
      },
    };
  }
};
