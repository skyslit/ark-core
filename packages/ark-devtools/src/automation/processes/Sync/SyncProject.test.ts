import {
  ManifestManager,
  useManifestController,
} from '../../../utils/ManifestManager';
import { Job } from '../../core/Automator';
import createSyncProcess from './SyncProject';
import rimraf from 'rimraf';
import fs from 'fs';
import path from 'path';

const testDir = path.join(
  __dirname,
  '../../../__test__/test-artifacts/setup-project-2'
);

// jest.mock('fs', () => {
//   const memfs = require('memfs');
//   return memfs.createFsFromVolume(memfs.Volume.fromJSON({}, '/test-dir'));
// });

beforeEach(() => {
  rimraf.sync(testDir);
  fs.mkdirSync(testDir, { recursive: true });
});

describe('project setup', () => {
  test(
    'should setup npm package, prettier etc...',
    async () => {
      // Write a dummy manifest file
      const manager = new ManifestManager(testDir, {
        name: 'fairytale',
      });
      manager.write();

      // Prepare the job
      const job = new Job(null, testDir);

      // Prepare the controller
      const controller = useManifestController();
      await createSyncProcess(controller).start(job);

      if (job.errors.length > 0) {
        throw job.errors[0];
      }

      const packageJsonContent = JSON.parse(
        fs.readFileSync(path.join(testDir, 'package.json'), 'utf-8')
      );
      expect(packageJsonContent.name).toStrictEqual('fairytale');
    },
    120 * 1000
  );
});
