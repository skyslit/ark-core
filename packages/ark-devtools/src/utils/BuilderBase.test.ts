/* eslint-disable require-jsdoc */
import {Compilation, Configuration} from 'webpack';
import {BuilderBase, ConfigurationOptions} from './BuilderBase';
import path from 'path';
import memfs from 'memfs';
import {Union} from 'unionfs';
import * as fs from 'fs';

describe('builder base configuration', () => {
  class SampleBuilder extends BuilderBase {
    getConfiguration({cwd, mode}: ConfigurationOptions): Configuration {
      return {
        mode,
      };
    }
  }

  test('getFullyQualifiedConfiguration() fn', () => {
    const builderInstance = new SampleBuilder();
    const configuration = builderInstance.getConfiguration({
      cwd: '/test',
      mode: 'production',
    });
    expect(configuration.mode).toEqual('production');
  });
});

describe('build stage: production', () => {
  class SampleBuilder extends BuilderBase {
    private entryPathname: string;
    constructor(entryPath: string) {
      super();
      this.entryPathname = entryPath;
    }

    getConfiguration({cwd, mode}: ConfigurationOptions): Configuration {
      return {
        mode,
        entry: this.entryPathname,
        output: {
          filename: 'main.js',
          path: path.resolve(cwd, 'build'),
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
          ],
        },
      };
    }
  }

  const cwd: string = process.cwd();
  const testRoot: string = '__webpack__test';
  let vol: any;
  let outputFileSystem: any;
  let inputFileSystem: any;

  beforeEach(() => {
    // Setup Output Filesystem
    vol = memfs.Volume.fromJSON({
      [`${testRoot}/main.server.ts`]: `console.log('Server program');`,
      [`${testRoot}/main-error.server.ts`]: `console.log('Server program);`,
      [`${testRoot}/dashboard.client.js`]:
        `console.log('Dashboard client program');`,
      [`${testRoot}/admin.client.js`]: `console.log('Admin client program');`,
    }, cwd);
    outputFileSystem = memfs.createFsFromVolume(vol);

    // Setup Input Filesystem
    inputFileSystem = new Union();
    inputFileSystem.use(fs).use(vol as any);
  });

  test('success operation', (done) => {
    const builderInstance = new SampleBuilder(
        path.join(cwd, testRoot, 'main.server.ts')
    );
    builderInstance.on('success', (compilation: Compilation) => {
      try {
        const buildOutput: string = outputFileSystem.readFileSync(
            path.join(cwd, 'build', 'main.js'),
            'utf-8'
        );
        expect(buildOutput).toContain('Server program');
        expect(buildOutput).toMatchSnapshot();
        done();
      } catch (e) {
        done(e);
      }
    });
    builderInstance.on('warning', (warnings) => {
      done(new Error('Warnings should not be thrown'));
    });
    builderInstance.on('error', (errors) => {
      done(new Error('Error should not be thrown'));
    });
    builderInstance.build({
      mode: 'production',
      cwd: process.cwd(),
    }, inputFileSystem, outputFileSystem);
  });
  // test('warnings operation', () => {

  // });
  test('error operation', (done) => {
    const builderInstance = new SampleBuilder(
        path.join(cwd, testRoot, 'main-error.server.ts')
    );
    builderInstance.on('success', () => {
      done(new Error('Should not trigger success'));
    });
    builderInstance.on('warning', (warnings) => {
      done(new Error('Should not trigger warning'));
    });
    builderInstance.on('error', (errors) => {
      expect(errors).toHaveLength(1);
      done();
    });
    builderInstance.build({
      mode: 'production',
      cwd: process.cwd(),
    }, inputFileSystem, outputFileSystem);
  });
});
