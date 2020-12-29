import fs from 'fs';
import path from 'path';
import ejs from 'ejs';
import webpack, {Configuration, Stats} from 'webpack';
import {EventEmitter} from 'events';
import {GhostFileActions} from './ghostFile';
import memfs from 'memfs';
import {ufs} from 'unionfs';

type Mode = 'development' | 'production';
export type ConfigurationOptions = {
  mode: Mode,
  cwd: string,
  watchMode?: boolean
}
/**
 * Wrapper for Webpack
 */
export class BuilderBase extends EventEmitter {
  private compiler: webpack.Compiler;
  private watching: any;
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
          watchMode: false,
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

    // Set ghost files
    const volume = this.getGhostFiles(opts).reduce((acc, ghostFile) => {
      return {
        ...acc,
        ...ghostFile.provide(opts.cwd),
      };
    }, {});

    if (Object.keys(volume).length > 0) {
      const _ufs = ufs
          .use(memfs.createFsFromVolume(
              memfs.Volume.fromJSON(volume, opts.cwd)
          ) as any)
          .use(this.compiler.inputFileSystem as any);
      this.compiler.inputFileSystem = _ufs;
    }

    if (opts.watchMode === true) {
      this.watching = this.compiler.watch({}, this.handler.bind(this));
    } else {
      this.compiler.run(this.handler.bind(this));
    }
  }

  /**
   * Teardown logic
   * @return {Promise}
   */
  teardown() {
    return new Promise((resolve, reject) => {
      this.removeAllListeners('success');
      this.removeAllListeners('warning');
      this.removeAllListeners('error');
      if (this.watching) {
        this.watching.close((err: any, result: any) => {
          if (err) {
            reject(err);
          } else {
            resolve(true);
          }
        });
      } else {
        resolve(true);
      }
    });
  }

  /**
   * Gets input ghost files
   * @param {ConfigurationOptions} opts
   * @return {GhostFileActions[]}
   */
  getGhostFiles(opts: ConfigurationOptions): GhostFileActions[] {
    return [];
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
   * Create alias mapping with peer dependencies
   * @param {string[]} dependencies
   * @param {string=} cwd Defaults to process.cwd()
   * @return {any}
   */
  mapPeerDependencies(dependencies: string[], cwd?: string): {
    [key: string]: string
  } {
    return dependencies.reduce((acc, dependency) => {
      cwd = cwd || process.cwd();
      let peerNodeModulesPath = path.resolve(cwd, 'node_modules', dependency);
      if (!fs.existsSync(peerNodeModulesPath)) {
        cwd = process.cwd();
        peerNodeModulesPath = path.resolve(cwd, 'node_modules', dependency);
      }
      return {
        [dependency]: peerNodeModulesPath,
        ...acc,
      };
    }, {});
  }

  /**
   * Generate file from template / retreives optional file
   * @param {string} cwd Current Working Directory
   * @param {string} relativePath Relative path of the file from project root
   * @param {string} ejsFilePath Template file path
   * @param {object=} data (Optional) template render options
   * @return {string} Optional file from project dir / template output
   */
  getOptionalFile(
      cwd: string,
      relativePath: string,
      ejsFilePath: string,
      data?: any
  ): string {
    const optionalFile: string = path.join(cwd, relativePath);
    if (fs.existsSync(optionalFile)) {
      // Output read file from projects dir
      return fs.readFileSync(optionalFile, 'utf-8');
    } else {
      if (fs.existsSync(ejsFilePath)) {
        // Read template file
        const template = fs.readFileSync(ejsFilePath, 'utf-8');
        return ejs.render(template, data);
      }
      // eslint-disable-next-line max-len
      throw new Error('Failed to compile replacement file. This indicates an error with Ark Build System, you may create an issue for this on GitHub.');
    }
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
