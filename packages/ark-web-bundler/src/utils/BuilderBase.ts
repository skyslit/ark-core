import webpack, {Compilation, Configuration, Stats} from 'webpack';
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
   * @param {any=} fs
   */
  build(opts: ConfigurationOptions, fs?: any) {
    const buildConfiguration = this.getConfiguration(
        Object.assign<
          ConfigurationOptions,
          Partial<ConfigurationOptions>
        >({
          mode: 'production',
          cwd: null,
        }, opts)
    );
    console.log(buildConfiguration);
    if (!buildConfiguration) {
      throw new Error(
          'webpack configuration should not be null'
      );
    }
    this.compiler = webpack(buildConfiguration);
    // if (fs) {
    //   this.compiler.inputFileSystem = fs;
    //   this.compiler.outputFileSystem = fs;
    //   this.compiler.watchFileSystem = fs;
    // }
    if (opts.mode === 'development') {
      this.compiler.watch({}, this.watchHandler.bind(this));
    } else if (opts.mode === 'production') {
      this.compiler.compile(this.handler.bind(this));
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
  private watchHandler(err?: Error, result?: Stats): void {
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

  /**
   * Handler
   * @param {Error} err
   * @param {Stats} result
   */
  private handler(err?: Error, result?: Compilation): void {
    if (err) {
      this.emit('error', [{
        message: err.message,
      }]);
    } else {
      if (result.errors.length > 0) {
        this.emit('error',
            result.errors,
            result
        );
      } else if (result.warnings.length > 0) {
        this.emit('warning',
            result.warnings,
            result
        );
      } else {
        this.emit('success', result);
      }
    }
  }
}
