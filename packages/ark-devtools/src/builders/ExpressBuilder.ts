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
        assetModuleFilename: '../assets/[hash][ext][query]',
      },
      target: 'node',
      externals: [nodeExternals()],
      plugins: [
        new IgnorePlugin({
          // Ignores css/scss/jpg/jpeg/png/svg/gif/mp3/mp4
          checkResource: (res) => {
            // eslint-disable-next-line no-unused-vars
            // const regex = /.(s?css|jpe?g|png|svg|gif|mp(3|4)|webp)/gmi;
            const regex = /.(s?css)/gmi;
            return regex.test(res).valueOf() ? true : false;
          },
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
