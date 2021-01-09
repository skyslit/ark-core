import { Job, TestMonitor } from '../../core/Automator';
import { ManifestManager } from '../../../utils/ManifestManager';
import SyncProjectProcess from './SyncProject';

const cwd = '/';

jest.mock('fs', () => {
  const memfs = require('memfs');
  return memfs.createFsFromVolume(memfs.Volume.fromJSON({}));
});

beforeEach(() => {
  const manager = new ManifestManager(cwd);
  manager.write();
});

test('workflow', async () => {
  await SyncProjectProcess.start(
    new Job(
      new TestMonitor({
        'package-name': 'package-name-from-prompt',
      }),
      cwd
    )
  );
});
