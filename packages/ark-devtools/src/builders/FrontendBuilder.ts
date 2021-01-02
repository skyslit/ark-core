import { Configuration } from 'webpack';
import { BuilderBase, ConfigurationOptions } from '../utils/BuilderBase';
import path from 'path';
import HTMLWebpackPlugin from 'html-webpack-plugin';
import { GhostFileActions, createGhostFile } from '../utils/ghostFile';

/**
 * SPA Builder
 */
export class SPABuilder extends BuilderBase {
  private appFilePath: string;
  private appId: string;
  /**
   * Creates a new SPA builder instance
   * @param {string} id
   * @param {string} appFilePath
   */
  constructor(id: string, appFilePath: string) {
    super();
    this.appId = id;
    this.appFilePath = appFilePath;

    if (!this.appId) {
      throw new Error('App ID should not be null');
    }
  }
  /**
   * Get Ghost Files
   * @param {ConfigurationOptions} opts
   * @return {GhostFileActions[]}
   */
  getGhostFiles(opts: ConfigurationOptions): GhostFileActions[] {
    return [
      createGhostFile(
        path.join(__dirname, './assets/Frontend/root.tsx.ejs'),
        'src/index.tsx',
        {
          relativeAppFilePath: path.relative(
            path.join(opts.cwd, 'src'),
            path.join(this.appFilePath)
          ),
        }
      ),
    ];
  }
  /**
   * @param {ConfigurationOptions} opts
   * @return {Configuration}
   */
  getConfiguration({ cwd, mode }: ConfigurationOptions): Configuration {
    return {
      context: cwd,
      mode,
      resolve: {
        extensions: ['.json', '.ts', '.tsx', '.js', '.jsx'],
        alias: {
          ...this.mapPeerDependencies(
            ['react', 'react-dom', 'react-router-dom'],
            cwd
          ),
        },
        symlinks: true,
      },
      entry: path.join(cwd, 'src', 'index.tsx'),
      output: {
        filename: `_browser/${this.appId}.js`,
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
                  __dirname,
                  '../../node_modules',
                  'babel-loader'
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
}
