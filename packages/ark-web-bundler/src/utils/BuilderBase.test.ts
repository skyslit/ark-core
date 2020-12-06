/* eslint-disable no-unused-vars */
/* eslint-disable max-len */
/* eslint-disable require-jsdoc */
import {Configuration} from 'webpack';
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

describe('build stage: development', () => {
  class SampleBuilder extends BuilderBase {
    getConfiguration({cwd, mode}: ConfigurationOptions): Configuration {
      return {
        mode,
        entry: path.join(cwd, './src/custom.js'),
        output: {
          filename: 'main.js',
          path: path.resolve(cwd, '1build'),
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

  test('success operation', (done) => {
    const builderInstance = new SampleBuilder();
    builderInstance.on('success', (compilation) => {
      done();
    });
    builderInstance.on('warning', () => {
      done();
    });
    builderInstance.on('error', (err) => {
      done(err);
    });
    builderInstance.build({
      mode: 'production',
      cwd: process.cwd(),
    });
  });
  test('warnings operation', () => {

  });
  test('error operation', () => {

  });
});

describe('build stage: production', () => {
  test('success operation', () => {

  });
  test('warnings operation', () => {

  });
  test('error operation', () => {

  });
});
