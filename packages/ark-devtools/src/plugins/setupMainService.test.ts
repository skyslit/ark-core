import projectSetup from './projectSetup';
import { ManifestController, ManifestManager } from '../utils/ManifestManager';
import { Job } from '../automation/core/Automator';
import createSyncProcess from '../automation/processes/Sync/SyncProject';
import rimraf from 'rimraf';
import fs from 'fs';
import path from 'path';

const testDir = path.join(
  __dirname,
  '../../../../../__ark_automated_test_artifacts__/main-server-setup-plugin'
);

beforeEach(() => {
  rimraf.sync(testDir);
  fs.mkdirSync(testDir, { recursive: true });
});

test('package accessor matches', () => {
  expect(projectSetup.setup().isTypeMatching('package')).toStrictEqual(true);
  expect(projectSetup.setup().isMatching('name')).toStrictEqual(true);
  expect(projectSetup.setup().isMatching('name.')).toStrictEqual(false);
  expect(projectSetup.setup().isMatching('.name')).toStrictEqual(false);
});

describe('project setup', () => {
  test(
    'should setup npm package, git, prettier etc...',
    async () => {
      // Write a dummy manifest file
      const manager = new ManifestManager(testDir, {
        serviceId: 'main',
      });
      manager.write();

      // Prepare the job
      const job = new Job(null, testDir);

      // Prepare the controller
      const controller = new ManifestController([
        projectSetup.setupMainService(),
      ]);
      await createSyncProcess(controller).start(job);

      if (job.errors.length > 0) {
        throw job.errors[0];
      }
    },
    180 * 1000
  );
});
