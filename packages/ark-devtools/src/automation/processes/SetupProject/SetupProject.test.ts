import {Job} from '../../core/Automator';
import SetupProjectProcess from './SetupProject';
import path from 'path';
import fs from 'fs';
import rimraf from 'rimraf';

const cwd = path.join(__dirname, './_test_project_setup_');

beforeEach(() => {
  if (fs.existsSync(cwd)) {
    rimraf.sync(cwd);
  }
  fs.mkdirSync(cwd);
});

test('workflow', async () => {
  await SetupProjectProcess.start(new Job({
    onNewPrompt: () => {

    },
  }, cwd));
});
