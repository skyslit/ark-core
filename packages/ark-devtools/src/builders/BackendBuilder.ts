import { Configuration } from 'webpack';
import nodeExternals from 'webpack-node-externals';
import { BuilderBase, ConfigurationOptions } from '../utils/BuilderBase';
import path from 'path';

/**
 * Backend Builder
 */
export class BackendBuilder extends BuilderBase {
  private entryFilePath: string;
  /**
   * Creates a new backend builder instance
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
      entry: this.entryFilePath,
      output: {
        publicPath: '/',
        filename: 'main.js',
        path: path.resolve(cwd, 'build', 'server'),
        assetModuleFilename: './assets/[hash][ext][query]',
      },
      target: 'node',
      externals: [
        nodeExternals({
          allowlist: ['@skyslit/ark-backend', '@skyslit/ark-frontend'],
        }),
      ],
      stats: {
        loggingTrace: false,
        errorStack: false,
      },
      plugins: [],
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
                      { targets: { node: 'current' }, modules: false },
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
                      { libraryName: 'antd' },
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
                  emitFile: false,
                },
              },
            ],
          },
          {
            test: this.getStyleTestExp(),
            loader: require.resolve('ignore-loader'),
          },
          {
            test: this.getLESSStyleTestExp(),
            loader: require.resolve('ignore-loader'),
          },
        ],
      },
    };
  }
}
