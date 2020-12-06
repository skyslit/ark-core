import webpack, {Configuration, Stats} from 'webpack';
import {EventEmitter} from 'events';

type Mode = 'development' | 'production';
export type ConfigurationOptions = {
  mode: Mode,
  cwd: string,
}
/**
 * Wrapper for Webpack
 */
export class BuilderBase extends EventEmitter {
  private compiler: webpack.Compiler;
  /**
   * Creates a new builder base instance
   * @param {EventEmitterOptions} options
   */
  constructor(options?: any) {
    super(options);
  }

  /**
   * Start build process
   * @param {ConfigurationOptions} opts
   * @param {any=} ifs Input filesystem
   * @param {any=} ofs Output filesystem
   * @param {any=} wfs Watch filesystem
   */
  build(opts: ConfigurationOptions, ifs?: any, ofs?: any, wfs?: any) {
    const buildConfiguration = this.getConfiguration(
        Object.assign<
          ConfigurationOptions,
          Partial<ConfigurationOptions>
        >({
          mode: 'production',
          cwd: null,
        }, opts)
    );
    if (!buildConfiguration) {
      throw new Error(
          'webpack configuration should not be null'
      );
    }
    this.compiler = webpack(buildConfiguration);
    if (ifs) {
      this.compiler.inputFileSystem = ifs;
    }
    if (ofs) {
      this.compiler.outputFileSystem = ofs;
    }
    if (wfs) {
      this.compiler.watchFileSystem = wfs;
    }
    if (opts.mode === 'development') {
      this.compiler.watch({}, this.handler.bind(this));
    } else if (opts.mode === 'production') {
      this.compiler.run(this.handler.bind(this));
    }
  }

  /**
   * Supported events
   * @return {string[]}
   */
  eventNames(): string[] {
    return [
      'success',
      'warning',
      'error',
    ];
  }

  /**
   * Gets configuration
   * @param {ConfigurationOptions} opts
   * @return {Configuration}
   */
  getConfiguration(opts: ConfigurationOptions): Configuration {
    return null;
  }

  /**
   * Handler
   * @param {Error} err
   * @param {Stats} result
   */
  private handler(err?: Error, result?: Stats): void {
    if (err) {
      this.emit('error', [{
        message: err.message,
      }]);
    } else {
      if (result.hasErrors()) {
        this.emit('error',
            result.compilation.errors,
            result.compilation,
            result
        );
      } else if (result.hasWarnings()) {
        this.emit('warning',
            result.compilation.warnings,
            result.compilation,
            result
        );
      } else {
        this.emit('success', result.compilation, result);
      }
    }
  }
}
