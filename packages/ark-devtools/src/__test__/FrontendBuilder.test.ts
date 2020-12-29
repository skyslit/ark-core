/* eslint-disable require-jsdoc */
import {Compilation} from 'webpack';
import {SPABuilder} from '../builders/FrontendBuilder';
import path from 'path';
import * as fs from 'fs';

describe('SPA app builder', () => {
  const testProjectDir: string = path.join(__dirname, './test-project');
  let outputFileSystem: any;

  beforeEach(() => {
    // Setup Output Filesystem
    outputFileSystem = fs;
  });

  test('successfull build', (done) => {
    const builderInstance = new SPABuilder(
        'admin',
        path.join(__dirname, './test-project/src/admin.client.tsx')
    );
    builderInstance.on('success', (compilation: Compilation) => {
      try {
        done();
      } catch (e) {
        done(e);
      }
    });
    builderInstance.on('warning', (warnings) => {
      done(new Error('Warnings should not be thrown'));
    });
    builderInstance.on('error', (errors) => {
      console.log(errors);
      done(new Error('Error should not be thrown'));
    });
    builderInstance.build({
      mode: 'production',
      cwd: testProjectDir,
    }, fs, outputFileSystem);
  }, 10 * 1000);
});
