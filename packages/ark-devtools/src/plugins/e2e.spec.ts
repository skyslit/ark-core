import {
  ManifestManager,
  useManifestController,
} from '../utils/ManifestManager';
import { Job } from '../automation/core/Automator';
import createSyncProcess from '../automation/processes/Sync/SyncProject';
import rimraf from 'rimraf';
import fs from 'fs';
import path from 'path';

const testDir = path.join(
  __dirname,
  '../../../../../__ark_automated_test_artifacts__/plugin-e2e'
);

beforeEach(() => {
  rimraf.sync(testDir);
  fs.mkdirSync(testDir, { recursive: true });
});

describe('project setup', () => {
  test(
    'should setup npm package, git, prettier etc...',
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
