/* eslint-disable require-jsdoc */
import {Compilation} from 'webpack';
import {SPABuilder} from '../builders/SPABuilder';
import path from 'path';
import memfs from 'memfs';
import * as fs from 'fs';

describe('SPA app builder', () => {
  const cwd: string = process.cwd();
  let vol: any;
  let outputFileSystem: any;

  beforeEach(() => {
    // Setup Output Filesystem
    vol = memfs.Volume.fromJSON({}, cwd);
    outputFileSystem = memfs.createFsFromVolume(vol);
    outputFileSystem = fs;
  });

  test('successfull build', (done) => {
    const builderInstance = new SPABuilder(
        'admin',
        path.join(__dirname, './test-project/src/admin.client.tsx')
    );
    builderInstance.on('success', (compilation: Compilation) => {
      try {
        // eslint-disable-next-line no-unused-vars
        const buildOutput: string = outputFileSystem.readFileSync(
            path.join(cwd, 'build', 'server', 'main.js'),
            'utf-8'
        );
        // expect(buildOutput).toContain('Server program');
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
      cwd: path.join(__dirname, './test-project'),
    }, fs, outputFileSystem);
  });
});
