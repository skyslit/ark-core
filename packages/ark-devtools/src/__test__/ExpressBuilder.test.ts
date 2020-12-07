/* eslint-disable require-jsdoc */
import {Compilation} from 'webpack';
import {ExpressBuilder} from '../builders/ExpressBuilder';
import path from 'path';
import memfs from 'memfs';
import {Union} from 'unionfs';
import * as fs from 'fs';

const appServerFile = fs.readFileSync(
    path.join(__dirname, './test-artifacts/mock_app.server.tsx'),
    'utf8'
);

describe('express app builder', () => {
  const cwd: string = process.cwd();
  const testRoot: string = 'src';
  let vol: any;
  let outputFileSystem: any;
  let inputFileSystem: any;

  beforeEach(() => {
    // Setup Output Filesystem
    vol = memfs.Volume.fromJSON({
      [`${testRoot}/app.server.ts`]: appServerFile,
      [`${testRoot}/dashboard.client.ts`]:
        `console.log('Dashboard client program');`,
      [`${testRoot}/admin.client.ts`]: `console.log('Admin client program');`,
    }, cwd);
    outputFileSystem = memfs.createFsFromVolume(vol);

    // Setup Input Filesystem
    inputFileSystem = new Union();
    inputFileSystem.use(fs).use(vol as any);
  });

  test('success operation', (done) => {
    const builderInstance = new ExpressBuilder(
        path.join(cwd, testRoot, 'app.server.ts')
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
      cwd: process.cwd(),
    }, inputFileSystem, outputFileSystem);
  });
});
