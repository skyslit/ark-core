import plugins from './projectSetup';
import { ManifestController, ManifestManager } from '../utils/ManifestManager';
import { Job } from '../automation/core/Automator';
import createSyncProcess from '../automation/processes/Sync/SyncProject';
import rimraf from 'rimraf';
import fs from 'fs';
import path from 'path';

const testDir = path.join(
  __dirname,
  '../../../../../__ark_automated_test_artifacts__/project-setup-plugin'
);

beforeEach(() => {
  rimraf.sync(testDir);
  fs.mkdirSync(testDir, { recursive: true });
});

test('accessor matches', () => {
  expect(plugins.setup().isTypeMatching('package')).toStrictEqual(true);
  expect(plugins.setup().isMatching('name')).toStrictEqual(true);
  expect(plugins.setup().isMatching('name.')).toStrictEqual(false);
  expect(plugins.setup().isMatching('.name')).toStrictEqual(false);
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
      const controller = new ManifestController([plugins.setup()]);
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
