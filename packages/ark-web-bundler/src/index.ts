import path from 'path';
import {spawnSync} from 'child_process';

spawnSync('node', [path.join(__dirname, './scripts/build.js')], {
  stdio: 'inherit',
});
