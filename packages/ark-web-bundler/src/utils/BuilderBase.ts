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
   * Start build process
   * @param {ConfigurationOptions=} opts
   */
  build(opts: ConfigurationOptions) {
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
    if (opts.mode === 'development') {
      this.compiler.watch({}, this.watchHandler);
    } else if (opts.mode === 'production') {
      this.compiler.compile(this.handler);
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
   * @param {ConfigurationOptions} opts
   * @return {Configuration}
   */
  getFullyQualifiedConfiguration(opts: ConfigurationOptions): Configuration {
    return Object.assign<
      Configuration,
      Configuration,
      Configuration
    >({}, this.getBaseConfiguration(opts), this.getConfiguration(opts));
  }

  /**
   * Gets base configuration
   * @param {ConfigurationOptions} opts
   * @return {Configuration}
   */
  private getBaseConfiguration(opts: ConfigurationOptions): Configuration {
    return {

    };
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
