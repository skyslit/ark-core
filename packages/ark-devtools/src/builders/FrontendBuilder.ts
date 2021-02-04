import { Configuration } from 'webpack';
import { BuilderBase, ConfigurationOptions } from '../utils/BuilderBase';
import path from 'path';
import HTMLWebpackPlugin from 'html-webpack-plugin';
import { GhostFileActions, createGhostFile } from '../utils/ghostFile';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';

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
        path.join(__dirname, '../../assets/Frontend/root.tsx.ejs'),
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
        modules: ['scripts', 'node_modules'],
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
        publicPath: '/',
        filename: `_browser/${this.appId}.js`,
        path: path.resolve(cwd, 'build'),
        assetModuleFilename: './assets/[hash][ext][query]',
      },
      plugins: [
        new HTMLWebpackPlugin({
          filename: `${this.appId}.html`,
          template: path.resolve(__dirname, '../../assets/index.template.html'),
        }),
        new MiniCssExtractPlugin({
          filename: `./assets/[name].css`,
        }),
      ],
      stats: {
        loggingTrace: false,
        errorStack: false,
      },
      module: {
        rules: [
          {
            test: /\.(ts|tsx|js|jsx)$/,
            exclude: /node_modules/,
            use: [
              {
                loader: require.resolve('babel-loader'),
                options: {
                  compact: false,
                  presets: [
                    [
                      require.resolve('@babel/preset-env'),
                      {
                        targets: { browsers: ['last 2 versions'] },
                        modules: false,
                      },
                    ],
                    [
                      require.resolve('@babel/preset-typescript'),
                      { allowNamespaces: true },
                    ],
                    [require.resolve('@babel/preset-react')],
                  ],
                  cacheDirectory: true,
                  plugins: [
                    [
                      require.resolve('babel-plugin-import'),
                      { libraryName: 'antd', style: true },
                    ],
                    require.resolve('@babel/plugin-proposal-class-properties'),
                    require.resolve('@babel/plugin-syntax-dynamic-import'),
                  ],
                },
              },
            ],
          },
          {
            test: /\.(png|svg|jpg|jpeg|gif)$/i,
            use: [
              {
                loader: require.resolve('file-loader'),
                options: {
                  name: '[contenthash].[ext]',
                  outputPath: 'assets',
                },
              },
            ],
          },
          {
            test: this.getStyleTestExp(),
            use: [
              {
                loader: MiniCssExtractPlugin.loader,
              },
              {
                loader: require.resolve('css-loader'),
              },
              {
                loader: require.resolve('sass-loader'),
              },
            ],
          },
          {
            test: this.getLESSStyleTestExp(),
            use: [
              {
                loader: MiniCssExtractPlugin.loader,
              },
              {
                loader: require.resolve('css-loader'),
              },
              {
                loader: require.resolve('less-loader'),
              },
            ],
          },
        ],
      },
    };
  }
}
