/* eslint-disable require-jsdoc */
import {Compilation} from 'webpack';
import {BackendBuilder} from '../builders/BackendBuilder';
import path from 'path';
import * as fs from 'fs';
import execa from 'execa';
import createRequest from 'supertest';

describe('backend builder', () => {
  const testProjectDir: string = path.join(__dirname, './test-project');
  let outputFileSystem: any;

  beforeEach(() => {
    // Setup Output Filesystem
    outputFileSystem = fs;
  });

  test('successfull build', (done) => {
    const builderInstance = new BackendBuilder(
        path.join(__dirname, './test-project/src/services/mock.server.tsx')
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
  });

  test('artifacts should run without error', (done) => {
    const testProcess = execa('node', [
      path.join(testProjectDir, 'build', 'server', 'main.js'),
    ]);

    testProcess.catch((e) => done(e));

    setTimeout(() => {
      const request = createRequest('http://localhost:3001/test');
      request.get('/').then((res) => {
        testProcess.kill();
        expect(res.status).toBe(200);
        done();
      })
          .catch((err) => {
            testProcess.kill();
            done(err);
          });
    }, 5000);
  }, 10 * 1000);

  test('server side rendering should work', (done) => {
    const testProcess = execa('node', [
      path.join(testProjectDir, 'build', 'server', 'main.js'),
    ]);

    testProcess.catch((e) => done(e));

    setTimeout(() => {
      const request = createRequest('http://localhost:3001');
      request.get('/').then((res) => {
        testProcess.kill();
        expect(res.text).toContain('Page 1 SSR Test');
        expect(res.status).toBe(200);
        done();
      })
          .catch((err) => {
            testProcess.kill();
            done(err);
          });
    }, 1000);
  });
});
