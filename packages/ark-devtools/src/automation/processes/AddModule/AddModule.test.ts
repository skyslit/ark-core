import { Job, TestMonitor } from '../../core/Automator';
import createAddModuleProcess from './AddModule';
import path from 'path';
import fs from 'fs';
import rimraf from 'rimraf';

// eslint-disable-next-line max-len
const cwd = path.join(
  __dirname,
  '../../../__test__/test-artifacts/setup-project'
);

beforeEach(() => {
  if (fs.existsSync(cwd)) {
    rimraf.sync(cwd);
  }
  fs.mkdirSync(cwd, { recursive: true });
});

test('workflow', async () => {
  await createAddModuleProcess().start(
    new Job(
      new TestMonitor({
        'package-name': 'package-name-from-prompt',
      }),
      cwd
    )
  );
});
